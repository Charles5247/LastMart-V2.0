/**
 * ─── SSE (Server-Sent Events) Route ──────────────────────────────────────────
 * Real-time push notifications to the browser via SSE.
 * No WebSocket server needed – works on Vercel, Netlify, Railway, etc.
 *
 * Endpoints:
 *   GET /api/sse          – Open SSE stream (requires auth token in query/header)
 *   GET /api/sse/status   – Connection count (admin)
 *   POST /api/sse/test    – Send a test event (dev only)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { verifyToken } from '../lib/auth';
import { sseManager } from '../lib/sse';

const router = Router();

/* ── GET /api/sse – Open SSE stream ─────────────────────────────────────────── */
router.get('/', (req: Request, res: Response) => {
  /* Auth: accept token from query string or Authorization header */
  const tokenFromQuery  = req.query.token  as string;
  const tokenFromHeader = (req.headers.authorization || '').replace('Bearer ', '');
  const token           = tokenFromQuery || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = payload.userId;

  /* Set SSE headers */
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.flushHeaders();

  /* Send initial connected event */
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream established', userId })}\n\n`);

  /* Register client */
  sseManager.addClient(userId, res);

  /* Keepalive ping every 25 seconds to prevent timeout */
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  /* Cleanup on client disconnect */
  req.on('close', () => {
    clearInterval(keepAlive);
    sseManager.removeClient(userId, res);
  });
});

/* ── GET /api/sse/status ─────────────────────────────────────────────────────── */
router.get('/status', (req: Request, res: Response) => {
  return res.json({
    success:         true,
    connected_users: sseManager.countAll(),
    user_ids:        sseManager.connectedUserIds(),
  });
});

/* ── POST /api/sse/test – dev test ──────────────────────────────────────────── */
router.post('/test', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  const { user_id, type = 'test', message = 'Test notification from server' } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const sent = sseManager.send(user_id, { type, message });
  return res.json({ success: true, delivered: sent });
});

export default router;
