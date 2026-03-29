import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/ads
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { city, type } = req.query as Record<string, string>;

    let query = `SELECT a.*, v.store_name as vendor_name, p.name as product_name 
      FROM advertisements a 
      JOIN vendors v ON a.vendor_id = v.id 
      LEFT JOIN products p ON a.product_id = p.id 
      WHERE a.status = 'active' AND a.end_date >= datetime('now')`;
    const params: any[] = [];

    if (city) { query += ` AND (a.target_city IS NULL OR LOWER(a.target_city) LIKE LOWER(?))`; params.push(`%${city}%`); }
    if (type) { query += ` AND a.type = ?`; params.push(type); }
    query += ` ORDER BY a.budget DESC LIMIT 10`;

    const ads = db.prepare(query).all(...params);
    return res.json({ success: true, data: ads });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ads
router.post('/', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Vendor access required' });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const { product_id, type, title, description, image, budget, start_date, end_date, target_city } = req.body;

    if (!type || !title || !budget || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    if (vendor.ad_balance < budget) {
      return res.status(400).json({ success: false, error: 'Insufficient ad balance' });
    }

    const adId = uuidv4();
    db.prepare(`INSERT INTO advertisements (id, vendor_id, product_id, type, title, description, image, budget, start_date, end_date, target_city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      adId, vendor.id, product_id || null, type, title, description || null, image || null, budget, start_date, end_date, target_city || null
    );

    if (product_id && type === 'sponsored_product') {
      db.prepare('UPDATE products SET is_sponsored = 1 WHERE id = ?').run(product_id);
    }

    return res.status(201).json({ success: true, message: 'Advertisement created', data: { id: adId } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
