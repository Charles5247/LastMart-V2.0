import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads/disputes');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR });

// ── GET /api/disputes ────────────────────────────────────────────
router.get('/', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    let disputes: any[] = [];
    try {
      disputes = (db as any).prepare(`
        SELECT d.*, o.total_amount as order_amount
        FROM disputes d JOIN orders o ON d.order_id = o.id
        WHERE d.buyer_id = ? ORDER BY d.created_at DESC
      `).all(user.userId);
    } catch {}
    res.json({ success: true, data: disputes });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/disputes ───────────────────────────────────────────
router.post('/', upload.single('evidence'), (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { order_id, reason, description } = req.body;
    if (!order_id || !reason || !description) return res.status(400).json({ success: false, message: 'Missing required fields' });
    // Check order belongs to user (try both user_id and customer_id columns)
    let order: any = null;
    try { order = (db as any).prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(order_id, user.userId); } catch {}
    if (!order) { try { order = (db as any).prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, user.userId); } catch {} }
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const id = `disp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const evidenceUrl = req.file ? req.file.path : null;
    try {
      (db as any).prepare(`INSERT INTO disputes (id, order_id, buyer_id, reason, description, evidence_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`).run(id, order_id, user.userId, reason, description, evidenceUrl);
    } catch {}
    res.json({ success: true, message: 'Dispute filed successfully', data: { id } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
