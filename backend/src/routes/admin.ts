/**
 * ─── Admin Routes ─────────────────────────────────────────────────────────────
 * Full admin control panel endpoints.
 *
 * GET  /api/admin/analytics           – platform overview stats
 * GET  /api/admin/vendors             – list all vendors with filters
 * PUT  /api/admin/vendors             – approve/suspend/feature vendor
 * GET  /api/admin/customers           – list all customers with filters
 * PUT  /api/admin/customers/:id       – suspend/unsuspend/manage customer
 * GET  /api/admin/products            – list all products with filters
 * PUT  /api/admin/products/:id        – activate/deactivate/feature product
 * GET  /api/admin/orders              – list all orders
 * PUT  /api/admin/orders/:id          – update order status
 * GET  /api/admin/kyc                 – list KYC submissions (alias)
 * GET  /api/admin/verifications       – list product verifications (alias)
 * GET  /api/admin/notifications       – send broadcast notification
 * POST /api/admin/notifications       – broadcast notification
 * GET  /api/admin/store-visits        – visit analytics
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { requireAuth } from '../lib/auth';

const router = Router();

function createNotification(db: any, userId: string, type: string, title: string, message: string, data: object = {}) {
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), userId, type, title, message, JSON.stringify(data));
}

/* ─── GET /api/admin/analytics ─────────────────────────────────────────────── */
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
    const suspendedUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE is_suspended = 1").get() as any).count;
    const pendingKyc = (db.prepare("SELECT COUNT(*) as count FROM kyc_verifications WHERE status='pending'").get() as any).count;
    const pendingProductVerifications = (db.prepare("SELECT COUNT(*) as count FROM product_verifications WHERE status='pending'").get() as any).count;
    const activeRankings = (db.prepare("SELECT COUNT(*) as count FROM vendor_rankings WHERE status='active'").get() as any).count;
    const rankingRevenue = (db.prepare("SELECT COALESCE(SUM(amount_paid),0) as total FROM vendor_rankings WHERE status='active' OR status='expired'").get() as any).total;
    const totalVisits = (db.prepare("SELECT COUNT(*) as count FROM store_visits WHERE visited_at > datetime('now','-30 days')").get() as any).count;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total_amount) as revenue 
      FROM orders WHERE payment_status = 'completed' 
      GROUP BY month ORDER BY month DESC LIMIT 6`).all();

    const topVendors = db.prepare(`
      SELECT v.store_name, v.total_sales, v.rating, v.city, v.status, v.kyc_status,
             COUNT(o.id) as order_count 
      FROM vendors v LEFT JOIN orders o ON v.id = o.vendor_id 
      WHERE v.status = 'approved' 
      GROUP BY v.id ORDER BY v.total_sales DESC LIMIT 5`).all();

    const recentOrders = db.prepare(`
      SELECT o.*, u.name as customer_name, v.store_name as vendor_name 
      FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id 
      ORDER BY o.created_at DESC LIMIT 10`).all() as any[];

    const categoryDist = db.prepare(`
      SELECT c.name, COUNT(p.id) as count 
      FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 
      GROUP BY c.id`).all();

    const recentKyc = db.prepare(`
      SELECT k.id, k.type, k.status, k.submitted_at, u.name as user_name, u.email
      FROM kyc_verifications k JOIN users u ON k.user_id = u.id
      ORDER BY k.submitted_at DESC LIMIT 5`).all();

    const rankingApps = db.prepare(`
      SELECT vr.id, vr.status, rp.name as pkg_name, v.store_name, vr.created_at
      FROM vendor_rankings vr
      JOIN ranking_packages rp ON vr.package_id = rp.id
      JOIN vendors v ON vr.vendor_id = v.id
      WHERE vr.status IN ('pending_payment', 'pending_approval')
      ORDER BY vr.created_at DESC LIMIT 5`).all();

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers, totalVendors, activeVendors, pendingVendors, totalProducts,
          totalOrders, totalRevenue, todayOrders, suspendedUsers, pendingKyc,
          pendingProductVerifications, activeRankings, rankingRevenue, totalVisits
        },
        monthlyRevenue, topVendors,
        recentOrders: recentOrders.map(o => ({ ...o, tracking_updates: JSON.parse(o.tracking_updates || '[]') })),
        categoryDist, recentKyc, rankingApps
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/admin/vendors ───────────────────────────────────────────────── */
router.get('/vendors', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { status, search, kyc_status } = req.query as Record<string, string>;

    let query = `
      SELECT v.*, u.name as user_name, u.email as user_email, u.is_suspended as user_suspended,
             u.kyc_status as user_kyc_status,
             (SELECT COUNT(*) FROM orders o WHERE o.vendor_id = v.id) as total_orders,
             (SELECT COUNT(*) FROM store_visits sv WHERE sv.vendor_id = v.id) as total_visits
      FROM vendors v JOIN users u ON v.user_id = u.id WHERE 1=1
    `;
    const params: any[] = [];

    if (status) { query += ` AND v.status = ?`; params.push(status); }
    if (kyc_status) { query += ` AND v.kyc_status = ?`; params.push(kyc_status); }
    if (search) {
      query += ` AND (v.store_name LIKE ? OR u.name LIKE ? OR v.city LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY v.created_at DESC`;

    return res.json({ success: true, data: db.prepare(query).all(...params) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/admin/vendors ───────────────────────────────────────────────── */
router.put('/vendors', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { vendor_id, status, is_featured, suspension_reason } = req.body;

    if (!vendor_id) return res.status(400).json({ success: false, error: 'Vendor ID required' });

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (status) { updateFields.push('status = ?'); updateValues.push(status); }
    if (is_featured !== undefined) { updateFields.push('is_featured = ?'); updateValues.push(is_featured); }
    updateFields.push("updated_at = datetime('now')");
    updateValues.push(vendor_id);

    db.prepare(`UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    const vendor = db.prepare('SELECT v.user_id, v.store_name FROM vendors v WHERE v.id = ?').get(vendor_id) as any;
    if (vendor) {
      // Suspend/unsuspend the user account too
      if (status === 'suspended') {
        db.prepare(`UPDATE users SET is_suspended=1, suspension_reason=?, updated_at=datetime('now') WHERE id=?`).run(suspension_reason || 'Suspended by admin', vendor.user_id);
      } else if (status === 'approved') {
        db.prepare(`UPDATE users SET is_suspended=0, suspension_reason=NULL, updated_at=datetime('now') WHERE id=?`).run(vendor.user_id);
      }

      const messages: Record<string, { title: string, msg: string }> = {
        approved: { title: '🎉 Store Approved!', msg: `Your store "${vendor.store_name}" has been approved! You can now start selling on LastMart.` },
        suspended: { title: '⚠️ Store Suspended', msg: `Your store "${vendor.store_name}" has been temporarily suspended. Reason: ${suspension_reason || 'Policy violation'}. Contact support for more information.` },
      };
      if (messages[status]) {
        createNotification(db, vendor.user_id, `vendor_${status}`, messages[status].title, messages[status].msg, { vendor_id, suspension_reason });
      }
    }

    return res.json({ success: true, message: 'Vendor updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/admin/customers ─────────────────────────────────────────────── */
router.get('/customers', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { search, suspended, kyc_status } = req.query as Record<string, string>;

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.is_suspended,
             u.suspension_reason, u.kyc_status, u.terms_accepted, u.created_at,
             COUNT(DISTINCT o.id) as total_orders,
             COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.customer_id
      WHERE u.role = 'customer'
    `;
    const params: any[] = [];

    if (suspended !== undefined) { query += ` AND u.is_suspended = ?`; params.push(parseInt(suspended)); }
    if (kyc_status) { query += ` AND u.kyc_status = ?`; params.push(kyc_status); }
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    return res.json({ success: true, data: db.prepare(query).all(...params) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/admin/customers/:id ─────────────────────────────────────────── */
router.put('/customers/:id', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const id = req.params.id as string;
    const { action, suspension_reason } = req.body;
    const db = getDB();

    const user = db.prepare('SELECT * FROM users WHERE id=? AND role=?').get(id, 'customer') as any;
    if (!user) return res.status(404).json({ success: false, error: 'Customer not found' });

    if (action === 'suspend') {
      db.prepare(`UPDATE users SET is_suspended=1, suspension_reason=?, updated_at=datetime('now') WHERE id=?`).run(
        suspension_reason || 'Account suspended for policy violations', id
      );
      createNotification(db, id, 'account_suspended',
        '⛔ Account Suspended',
        `Your LastMart account has been suspended. Reason: ${suspension_reason || 'Policy violation'}. Contact support to appeal.`,
        { suspension_reason }
      );
    } else if (action === 'unsuspend') {
      db.prepare(`UPDATE users SET is_suspended=0, suspension_reason=NULL, updated_at=datetime('now') WHERE id=?`).run(id);
      createNotification(db, id, 'account_restored',
        '✅ Account Reinstated',
        'Your LastMart account has been reinstated. You can now shop normally. Please review our marketplace rules.',
        {}
      );
    } else if (action === 'delete') {
      db.prepare(`DELETE FROM users WHERE id=? AND role='customer'`).run(id);
      return res.json({ success: true, message: 'Customer deleted' });
    }

    return res.json({ success: true, message: `Customer ${action}ed successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/admin/products ──────────────────────────────────────────────── */
router.get('/products', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { search, is_active, verification_status, category_id } = req.query as Record<string, string>;

    let query = `
      SELECT p.*, c.name as category_name, v.store_name, v.city as vendor_city,
             u.name as vendor_owner, u.email as vendor_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN vendors v ON p.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (is_active !== undefined) { query += ` AND p.is_active = ?`; params.push(parseInt(is_active)); }
    if (verification_status) { query += ` AND p.verification_status = ?`; params.push(verification_status); }
    if (category_id) { query += ` AND p.category_id = ?`; params.push(category_id); }
    if (search) {
      query += ` AND (p.name LIKE ? OR v.store_name LIKE ? OR u.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY p.created_at DESC`;

    const products = db.prepare(query).all(...params) as any[];
    return res.json({
      success: true,
      data: products.map(p => ({ ...p, images: JSON.parse(p.images || '[]'), tags: JSON.parse(p.tags || '[]') }))
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/admin/products/:id ──────────────────────────────────────────── */
router.put('/products/:id', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const id = req.params.id as string;
    const { is_active, is_featured, is_ranked, verification_status, reason } = req.body;
    const db = getDB();

    const product = db.prepare(`
      SELECT p.*, v.user_id as vendor_user_id, v.store_name
      FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id=?
    `).get(id) as any;
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const updates: string[] = [];
    const vals: any[] = [];

    if (is_active !== undefined) { updates.push('is_active=?'); vals.push(is_active); }
    if (is_featured !== undefined) { updates.push('is_featured=?'); vals.push(is_featured); }
    if (is_ranked !== undefined) { updates.push('is_ranked=?'); vals.push(is_ranked); }
    if (verification_status) { updates.push('verification_status=?'); vals.push(verification_status); }
    updates.push("updated_at=datetime('now')");
    vals.push(id);

    if (updates.length > 1) {
      db.prepare(`UPDATE products SET ${updates.join(',')} WHERE id=?`).run(...vals);
    }

    // Notify vendor
    if (is_active === 0) {
      createNotification(db, product.vendor_user_id, 'product_deactivated',
        '⚠️ Product Deactivated',
        `Your product "${product.name}" has been deactivated. ${reason || 'Contact support for details.'}`,
        { product_id: id }
      );
    } else if (is_featured !== undefined) {
      createNotification(db, product.vendor_user_id, 'product_featured',
        is_featured ? '⭐ Product Featured!' : 'ℹ️ Product Unfeatured',
        is_featured ? `"${product.name}" is now featured on the marketplace!` : `"${product.name}" has been removed from featured listings.`,
        { product_id: id }
      );
    }

    return res.json({ success: true, message: 'Product updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/admin/orders ─────────────────────────────────────────────────── */
router.get('/orders', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { status, search } = req.query as Record<string, string>;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email,
             v.store_name, v.city as vendor_city
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      JOIN vendors v ON o.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { query += ` AND o.status=?`; params.push(status); }
    if (search) {
      query += ` AND (u.name LIKE ? OR v.store_name LIKE ? OR o.id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const orders = db.prepare(query).all(...params) as any[];
    const total = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE 1=1${status ? ` AND status='${status}'` : ''}`).get() as any).c;

    return res.json({
      success: true,
      data: orders.map(o => ({ ...o, tracking_updates: JSON.parse(o.tracking_updates || '[]') })),
      pagination: { total, page, limit }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/admin/orders/:id ─────────────────────────────────────────────── */
router.put('/orders/:id', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const id = req.params.id as string;
    const { status, payment_status } = req.body;
    const db = getDB();

    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(id) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const updates: string[] = ["updated_at=datetime('now')"];
    const vals: any[] = [];

    if (status) { updates.unshift('status=?'); vals.push(status); }
    if (payment_status) { updates.unshift('payment_status=?'); vals.push(payment_status); }
    vals.push(id);

    if (updates.length > 1) {
      db.prepare(`UPDATE orders SET ${updates.join(',')} WHERE id=?`).run(...vals);
    }

    if (status) {
      const msgs: Record<string, { title: string, msg: string }> = {
        confirmed: { title: '✅ Order Confirmed', msg: `Your order #${id.slice(0,8).toUpperCase()} has been confirmed.` },
        cancelled: { title: '❌ Order Cancelled', msg: `Your order #${id.slice(0,8).toUpperCase()} has been cancelled by admin.` },
        delivered: { title: '🎉 Order Delivered', msg: `Your order #${id.slice(0,8).toUpperCase()} has been marked as delivered.` },
      };
      if (msgs[status]) {
        createNotification(db, order.customer_id, `order_${status}`, msgs[status].title, msgs[status].msg, { order_id: id });
      }
    }

    return res.json({ success: true, message: 'Order updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── POST /api/admin/notifications ────────────────────────────────────────── */
// Admin broadcasts notification to users
router.post('/notifications', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { target_role, target_user_id, title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, error: 'title and message required' });

    const db = getDB();
    let targetUsers: any[] = [];

    if (target_user_id) {
      targetUsers = [{ id: target_user_id }];
    } else if (target_role === 'all') {
      targetUsers = db.prepare('SELECT id FROM users WHERE is_suspended=0').all() as any[];
    } else if (target_role) {
      targetUsers = db.prepare('SELECT id FROM users WHERE role=? AND is_suspended=0').all(target_role) as any[];
    }

    let sent = 0;
    for (const u of targetUsers) {
      createNotification(db, u.id, type || 'admin_broadcast', title, message, { from: 'admin' });
      sent++;
    }

    return res.json({ success: true, message: `Notification sent to ${sent} users` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/admin/store-visits ──────────────────────────────────────────── */
router.get('/store-visits', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const topVisited = db.prepare(`
      SELECT v.id, v.store_name, v.city, v.category,
             COUNT(sv.id) as visit_count,
             COUNT(DISTINCT sv.visitor_id) as unique_visitors
      FROM store_visits sv JOIN vendors v ON sv.vendor_id = v.id
      WHERE sv.visited_at > datetime('now', '-30 days')
      GROUP BY v.id ORDER BY visit_count DESC LIMIT 10
    `).all();

    const recentVisits = db.prepare(`
      SELECT sv.*, v.store_name FROM store_visits sv JOIN vendors v ON sv.vendor_id = v.id
      ORDER BY sv.visited_at DESC LIMIT 50
    `).all();

    return res.json({ success: true, data: { topVisited, recentVisits } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
