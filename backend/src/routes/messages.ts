import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// ── GET /api/messages/conversations ─────────────────────────────
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    let conversations: any[] = [];
    try {
      if (user.role === 'vendor') {
        const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
        if (!vendor) return res.json({ success: true, data: [] });
        conversations = (db as any).prepare(`
          SELECT c.*, u.name as buyer_name
          FROM conversations c JOIN users u ON c.buyer_id = u.id
          WHERE c.vendor_id = ? ORDER BY c.updated_at DESC
        `).all(vendor.id);
      } else {
        conversations = (db as any).prepare(`
          SELECT c.*, v.store_name as vendor_name
          FROM conversations c JOIN vendors v ON c.vendor_id = v.id
          WHERE c.buyer_id = ? ORDER BY c.updated_at DESC
        `).all(user.userId);
      }
    } catch {}
    res.json({ success: true, data: conversations });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/messages/:conversationId ───────────────────────────
router.get('/:conversationId', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    let messages: any[] = [];
    try {
      messages = (db as any).prepare(`
        SELECT m.*, u.name as sender_name, u.role as sender_role
        FROM messages m JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ? ORDER BY m.created_at ASC
      `).all(req.params.conversationId);
      (db as any).prepare('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?').run(req.params.conversationId, user.userId);
    } catch {}
    res.json({ success: true, data: messages });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/messages/start ─────────────────────────────────────
router.post('/start', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { vendor_id, initial_message } = req.body;
    if (!vendor_id) return res.status(400).json({ success: false, message: 'vendor_id required' });
    let conv: any = null;
    try {
      conv = (db as any).prepare('SELECT * FROM conversations WHERE buyer_id = ? AND vendor_id = ?').get(user.userId, vendor_id);
      if (!conv) {
        const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        (db as any).prepare('INSERT INTO conversations (id, buyer_id, vendor_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(convId, user.userId, vendor_id);
        conv = (db as any).prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
      }
      if (initial_message && conv) {
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        (db as any).prepare('INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)').run(msgId, conv.id, user.userId, initial_message);
      }
    } catch {}
    res.json({ success: true, data: conv });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/messages/:conversationId ──────────────────────────
router.post('/:conversationId', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let message: any = null;
    try {
      (db as any).prepare('INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)').run(id, req.params.conversationId, user.userId, content);
      (db as any).prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.conversationId);
      message = (db as any).prepare(`SELECT m.*, u.name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`).get(id);
    } catch {}
    res.json({ success: true, data: message });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
