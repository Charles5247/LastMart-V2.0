import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { requireAuth } from '../lib/auth';

const router = Router();

// GET /api/admin/analytics
router.get('/analytics', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();

    const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as any).count;
    const totalVendors = (db.prepare('SELECT COUNT(*) as count FROM vendors').get() as any).count;
    const activeVendors = (db.prepare("SELECT COUNT(*) as count FROM vendors WHERE status = 'approved'").get() as any).count;
    const pendingVendors = (db.prepare("SELECT COUNT(*) as count FROM vendors WHERE status = 'pending'").get() as any).count;
    const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as any).count;
    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count;
    const totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'completed'").get() as any).total;
    const todayOrders = (db.prepare(`SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')`).get() as any).count;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total_amount) as revenue 
      FROM orders WHERE payment_status = 'completed' 
      GROUP BY month ORDER BY month DESC LIMIT 6`).all();

    const topVendors = db.prepare(`SELECT v.store_name, v.total_sales, v.rating, v.city, COUNT(o.id) as order_count FROM vendors v LEFT JOIN orders o ON v.id = o.vendor_id WHERE v.status = 'approved' GROUP BY v.id ORDER BY v.total_sales DESC LIMIT 5`).all();

    const recentOrders = db.prepare(`SELECT o.*, u.name as customer_name, v.store_name as vendor_name FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id ORDER BY o.created_at DESC LIMIT 10`).all() as any[];

    const categoryDist = db.prepare(`SELECT c.name, COUNT(p.id) as count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 GROUP BY c.id`).all();

    return res.json({
      success: true,
      data: {
        stats: { totalUsers, totalVendors, activeVendors, pendingVendors, totalProducts, totalOrders, totalRevenue, todayOrders },
        monthlyRevenue, topVendors,
        recentOrders: recentOrders.map(o => ({ ...o, tracking_updates: JSON.parse(o.tracking_updates || '[]') })),
        categoryDist
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/vendors
router.get('/vendors', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { status, search } = req.query as Record<string, string>;

    let query = `SELECT v.*, u.name as user_name, u.email as user_email FROM vendors v JOIN users u ON v.user_id = u.id WHERE 1=1`;
    const params: any[] = [];

    if (status) { query += ` AND v.status = ?`; params.push(status); }
    if (search) { query += ` AND (v.store_name LIKE ? OR u.name LIKE ? OR v.city LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ` ORDER BY v.created_at DESC`;

    const vendors = db.prepare(query).all(...params);
    return res.json({ success: true, data: vendors });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/vendors
router.put('/vendors', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { vendor_id, status, is_featured } = req.body;

    if (!vendor_id) return res.status(400).json({ success: false, error: 'Vendor ID required' });

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (status) { updateFields.push('status = ?'); updateValues.push(status); }
    if (is_featured !== undefined) { updateFields.push('is_featured = ?'); updateValues.push(is_featured); }
    updateFields.push("updated_at = datetime('now')");
    updateValues.push(vendor_id);

    db.prepare(`UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    if (status) {
      const vendor = db.prepare('SELECT v.user_id, v.store_name FROM vendors v WHERE v.id = ?').get(vendor_id) as any;
      if (vendor) {
        const messages: Record<string, { title: string, msg: string }> = {
          approved: { title: '🎉 Store Approved!', msg: `Your store "${vendor.store_name}" has been approved! You can now start selling on LastMart.` },
          suspended: { title: '⚠️ Store Suspended', msg: `Your store "${vendor.store_name}" has been temporarily suspended. Contact support for more information.` },
        };
        if (messages[status]) {
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
            uuidv4(), vendor.user_id, `vendor_${status}`, messages[status].title, messages[status].msg
          );
        }
      }
    }

    return res.json({ success: true, message: 'Vendor updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
