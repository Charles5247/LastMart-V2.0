import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/reviews
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { vendor_id, product_id } = req.query as Record<string, string>;

    let query = `SELECT r.*, u.name as customer_name, u.avatar as customer_avatar FROM reviews r JOIN users u ON r.customer_id = u.id WHERE 1=1`;
    const params: any[] = [];

    if (vendor_id) { query += ` AND r.vendor_id = ?`; params.push(vendor_id); }
    if (product_id) { query += ` AND r.product_id = ?`; params.push(product_id); }
    query += ` ORDER BY r.created_at DESC`;

    const reviews = db.prepare(query).all(...params);
    return res.json({ success: true, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reviews
router.post('/', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'customer') {
      return res.status(403).json({ success: false, error: 'Customer access required' });
    }

    const db = getDB();
    const { vendor_id, product_id, order_id, rating, comment } = req.body;

    if (!vendor_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Vendor ID and valid rating (1-5) are required' });
    }

    const reviewId = uuidv4();
    db.prepare(`INSERT INTO reviews (id, customer_id, vendor_id, product_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      reviewId, userPayload.userId, vendor_id, product_id || null, order_id || null, rating, comment || null
    );

    const avgResult = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE vendor_id = ?').get(vendor_id) as any;
    db.prepare('UPDATE vendors SET rating = ?, total_reviews = ? WHERE id = ?').run(
      parseFloat(avgResult.avg_rating.toFixed(1)), avgResult.total, vendor_id
    );

    if (product_id) {
      const prodAvg = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?').get(product_id) as any;
      db.prepare('UPDATE products SET rating = ?, total_reviews = ? WHERE id = ?').run(
        parseFloat(prodAvg.avg_rating.toFixed(1)), prodAvg.total, product_id
      );
    }

    const vendorUser = db.prepare('SELECT user_id, store_name FROM vendors WHERE id = ?').get(vendor_id) as any;
    if (vendorUser) {
      const stars = '⭐'.repeat(rating);
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'new_review', ?, ?)`).run(
        uuidv4(), vendorUser.user_id, '⭐ New Customer Review!',
        `A customer left a ${rating}-star review (${stars}) for your store.`
      );
    }

    return res.status(201).json({ success: true, message: 'Review submitted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
