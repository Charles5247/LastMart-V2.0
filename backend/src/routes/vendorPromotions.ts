import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// ── GET /api/vendors/promotions ──────────────────────────────────
router.get('/promotions', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.json({ success: true, data: [] });
    let promotions: any[] = [];
    try { promotions = (db as any).prepare('SELECT * FROM vendor_promotions WHERE vendor_id = ? ORDER BY created_at DESC').all(vendor.id); } catch {}
    res.json({ success: true, data: promotions });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/vendors/promotions ─────────────────────────────────
router.post('/promotions', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { title, type, discount_percent, start_date, end_date, min_purchase, buy_quantity, get_quantity, product_ids } = req.body;
    if (!title || !type || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Missing required fields' });
    const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const id = `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      (db as any).prepare(`INSERT INTO vendor_promotions (id, vendor_id, title, type, discount_percent, start_date, end_date, min_purchase, buy_quantity, get_quantity, product_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(id, vendor.id, title, type, discount_percent || null, start_date, end_date, min_purchase || null, buy_quantity || null, get_quantity || null, product_ids?.length ? JSON.stringify(product_ids) : null);
    } catch {}
    res.json({ success: true, message: 'Promotion created', data: { id } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── DELETE /api/vendors/promotions/:id ──────────────────────────
router.delete('/promotions/:id', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    try { (db as any).prepare('DELETE FROM vendor_promotions WHERE id = ? AND vendor_id = ?').run(req.params.id, vendor.id); } catch {}
    res.json({ success: true, message: 'Promotion deleted' });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
