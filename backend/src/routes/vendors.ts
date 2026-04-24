import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest, requireAuth } from '../lib/auth';
import { calculateDistance } from '../lib/utils';

const router = Router();

function createNotification(db: any, userId: string, type: string, title: string, message: string, data: object = {}) {
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), userId, type, title, message, JSON.stringify(data));
}

// GET /api/vendors
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { city, category, search } = req.query as Record<string, string>;
    const lat = parseFloat(req.query.lat as string || '0');
    const lng = parseFloat(req.query.lng as string || '0');
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '12');
    const offset = (page - 1) * limit;

    let query = `SELECT v.*, u.name as user_name, u.email as user_email FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.status = 'approved'`;
    const params: any[] = [];

    if (city) { query += ` AND LOWER(v.city) LIKE LOWER(?)`; params.push(`%${city}%`); }
    if (category) { query += ` AND v.category = ?`; params.push(category); }
    if (search) { query += ` AND (v.store_name LIKE ? OR v.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }

    query += ` ORDER BY v.is_featured DESC, v.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    let vendors = db.prepare(query).all(...params) as any[];

    if (lat && lng) {
      vendors = vendors.map(v => ({
        ...v,
        distance: v.latitude && v.longitude ? calculateDistance(lat, lng, v.latitude, v.longitude) : null
      })).sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    const countQuery = `SELECT COUNT(*) as total FROM vendors v WHERE v.status = 'approved'${city ? ` AND LOWER(v.city) LIKE LOWER('%${city}%')` : ''}`;
    const { total } = db.prepare(countQuery).get() as any;

    return res.json({ success: true, data: vendors, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vendors/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const vendor = db.prepare(`
      SELECT v.*, u.name as user_name, u.email as user_email 
      FROM vendors v JOIN users u ON v.user_id = u.id 
      WHERE v.id = ?`).get(id) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    // Track store visit
    try {
      const userPayload = getUserFromRequest(req);
      const visitorId = userPayload?.userId || null;
      const sessionId = req.headers['x-session-id'] as string || uuidv4();
      const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

      // Only log once per session per store
      const recentVisit = db.prepare(`
        SELECT id FROM store_visits WHERE vendor_id=? AND session_id=? AND visited_at > datetime('now','-1 hour')
      `).get(id, sessionId);

      if (!recentVisit) {
        let visitorName: string | null = null;
        if (visitorId) {
          const u = db.prepare('SELECT name FROM users WHERE id=?').get(visitorId) as any;
          visitorName = u?.name || null;
        }
        db.prepare(`INSERT INTO store_visits (id, vendor_id, visitor_id, visitor_name, session_id, ip_address) VALUES (?,?,?,?,?,?)`)
          .run(uuidv4(), id, visitorId, visitorName, sessionId, ip);

        // Notify the vendor about the store visit
        const displayName = visitorName || 'A customer';
        createNotification(db, vendor.user_id, 'store_visit',
          '👀 New Store Visit',
          `${displayName} just visited your store "${vendor.store_name}".`,
          { vendor_id: id, visitor_id: visitorId, visitor_name: visitorName }
        );
      }
    } catch { /* Visit tracking errors should not break the main response */ }

    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.vendor_id = ? AND p.is_active = 1 
      ORDER BY p.is_featured DESC, p.created_at DESC`).all(id) as any[];

    const reviews = db.prepare(`
      SELECT r.*, u.name as customer_name, u.avatar as customer_avatar 
      FROM reviews r JOIN users u ON r.customer_id = u.id 
      WHERE r.vendor_id = ? ORDER BY r.created_at DESC LIMIT 10`).all(id);

    const parsedProducts = products.map(p => ({
      ...p, images: JSON.parse(p.images || '[]'), tags: JSON.parse(p.tags || '[]')
    }));

    // Recent store visits count
    const visitStats = db.prepare(`
      SELECT COUNT(*) as total_visits,
             COUNT(DISTINCT CASE WHEN visited_at > datetime('now','-7 days') THEN id END) as week_visits
      FROM store_visits WHERE vendor_id=?
    `).get(id) as any;

    return res.json({ success: true, data: { vendor, products: parsedProducts, reviews, visit_stats: visitStats } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vendors (update store info)
router.post('/', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });

    const { store_name, description, category, city, address, phone, email } = req.body;
    db.prepare(`UPDATE vendors SET store_name = ?, description = ?, category = ?, city = ?, address = ?, phone = ?, email = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
      store_name, description, category, city, address, phone, email, userPayload.userId
    );

    const updated = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId);
    return res.json({ success: true, data: updated, message: 'Store updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/vendors/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    if (vendor.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { store_name, description, category, city, address, phone, email, status } = req.body;
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (store_name) { updateFields.push('store_name = ?'); updateValues.push(store_name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (category) { updateFields.push('category = ?'); updateValues.push(category); }
    if (city) { updateFields.push('city = ?'); updateValues.push(city); }
    if (address !== undefined) { updateFields.push('address = ?'); updateValues.push(address); }
    if (phone !== undefined) { updateFields.push('phone = ?'); updateValues.push(phone); }
    if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
    if (status && userPayload.role === 'admin') { updateFields.push('status = ?'); updateValues.push(status); }

    if (updateFields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    updateFields.push("updated_at = datetime('now')");
    updateValues.push(id);

    db.prepare(`UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
    const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Vendor updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vendors/analytics (vendor analytics)
router.get('/me/analytics', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['vendor']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(auth.user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE vendor_id = ?').get(vendor.id) as any).count;
    const totalRevenue = (db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE vendor_id = ? AND payment_status = 'completed'`).get(vendor.id) as any).total;
    const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE vendor_id = ? AND is_active = 1').get(vendor.id) as any).count;
    const pendingOrders = (db.prepare(`SELECT COUNT(*) as count FROM orders WHERE vendor_id = ? AND status = 'pending'`).get(vendor.id) as any).count;
    const lowStockProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE vendor_id = ? AND stock < 5 AND is_active = 1').get(vendor.id) as any).count;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total_amount) as revenue 
      FROM orders WHERE vendor_id = ? AND payment_status = 'completed' 
      GROUP BY month ORDER BY month DESC LIMIT 6`).all(vendor.id);

    const topProducts = db.prepare(`
      SELECT p.name, p.total_sales, p.stock, p.price, p.rating 
      FROM products p WHERE p.vendor_id = ? AND p.is_active = 1 
      ORDER BY p.total_sales DESC LIMIT 5`).all(vendor.id);

    const recentOrders = db.prepare(`
      SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.customer_id = u.id 
      WHERE o.vendor_id = ? ORDER BY o.created_at DESC LIMIT 5`).all(vendor.id) as any[];

    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders WHERE vendor_id = ? GROUP BY status`).all(vendor.id);

    return res.json({
      success: true,
      data: {
        vendor, stats: { totalOrders, totalRevenue, totalProducts, pendingOrders, lowStockProducts },
        monthlyRevenue, topProducts,
        recentOrders: recentOrders.map(o => ({ ...o, tracking_updates: JSON.parse(o.tracking_updates || '[]') })),
        ordersByStatus
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
