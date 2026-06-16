import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/users/me
router.get('/me', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const user = db.prepare('SELECT id, name, email, role, avatar, phone, address, city, latitude, longitude, created_at FROM users WHERE id = ?').get(userPayload.userId) as any;
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.id);
    }

    return res.json({ success: true, data: { user, vendor: vendorInfo } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/users/me
router.put('/me', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const { name, phone, address, city, latitude, longitude } = req.body;

    db.prepare(`UPDATE users SET name = ?, phone = ?, address = ?, city = ?, latitude = ?, longitude = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name, phone || null, address || null, city || null, latitude || null, longitude || null, userPayload.userId
    );

    const user = db.prepare('SELECT id, name, email, role, avatar, phone, address, city, latitude, longitude FROM users WHERE id = ?').get(userPayload.userId);
    return res.json({ success: true, data: user, message: 'Profile updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/saved-vendors
router.get('/saved-vendors', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const saved = db.prepare(`SELECT sv.*, v.store_name, v.description, v.logo, v.category, v.city, v.rating, v.total_reviews, v.status FROM saved_vendors sv JOIN vendors v ON sv.vendor_id = v.id WHERE sv.user_id = ? ORDER BY sv.created_at DESC`).all(userPayload.userId);

    return res.json({ success: true, data: saved });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/saved-vendors
router.post('/saved-vendors', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const { vendor_id } = req.body;

    const existing = db.prepare('SELECT id FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').get(userPayload.userId, vendor_id);
    if (existing) return res.status(400).json({ success: false, error: 'Already saved' });

    db.prepare('INSERT INTO saved_vendors (id, user_id, vendor_id) VALUES (?, ?, ?)').run(uuidv4(), userPayload.userId, vendor_id);
    return res.json({ success: true, message: 'Vendor saved' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/saved-vendors
router.delete('/saved-vendors', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const vendorId = req.query.vendor_id as string;

    db.prepare('DELETE FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').run(userPayload.userId, vendorId);
    return res.json({ success: true, message: 'Vendor unsaved' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── Wishlist routes ───────────────────────────────────────────────────────────

// GET /api/users/wishlist
router.get('/wishlist', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const db = getDB();
    const items = db.prepare(`
      SELECT p.*, v.store_name as vendor_name, wi.created_at as saved_at
      FROM wishlist_items wi
      JOIN products p ON wi.product_id = p.id
      JOIN vendors v ON p.vendor_id = v.id
      WHERE wi.user_id = ? ORDER BY wi.created_at DESC
    `).all(userPayload.userId);
    return res.json({ success: true, data: items });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/wishlist
router.post('/wishlist', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const db = getDB();
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ success: false, error: 'product_id required' });
    const id = uuidv4();
    db.prepare('INSERT OR IGNORE INTO wishlist_items (id, user_id, product_id) VALUES (?, ?, ?)').run(id, userPayload.userId, product_id);
    return res.json({ success: true, message: 'Added to wishlist' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/wishlist/:productId
router.delete('/wishlist/:productId', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const db = getDB();
    db.prepare('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?').run(userPayload.userId, req.params.productId);
    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
