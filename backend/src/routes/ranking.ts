/**
 * ─── Ranking & Advertising Routes ───────────────────────────────────────────
 * Manages paid ranking packages for vendors and products.
 *
 * GET  /api/ranking/packages           – list available packages
 * POST /api/ranking/apply              – vendor: apply for ranking
 * GET  /api/ranking/my                 – vendor: my rankings
 * GET  /api/ranking/admin              – admin: all ranking applications
 * PUT  /api/ranking/admin/:id          – admin: approve/reject/manage ranking
 * GET  /api/ranking/active             – public: active rankings (homepage, search)
 * POST /api/ranking/notify-ready       – vendor: notify order ready for pickup/delivery
 * GET  /api/ranking/lama-recommendations – LAMA-driven ranking suggestions for admin
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest, requireAuth } from '../lib/auth';

const router = Router();

function createNotification(db: any, userId: string, type: string, title: string, message: string, data: object = {}) {
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), userId, type, title, message, JSON.stringify(data));
}

/* ─── GET /api/ranking/packages ────────────────────────────────────────────── */
router.get('/packages', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { type } = req.query as Record<string, string>;
    let q = `SELECT * FROM ranking_packages WHERE is_active=1`;
    const params: any[] = [];
    if (type) { q += ` AND type=?`; params.push(type); }
    q += ` ORDER BY priority_level ASC`;
    const packages = db.prepare(q).all(...params) as any[];
    return res.json({ success: true, data: packages.map(p => ({ ...p, features: JSON.parse(p.features || '[]') })) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── POST /api/ranking/apply ──────────────────────────────────────────────── */
router.post('/apply', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Only vendors can apply for rankings' });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id=?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const { package_id, product_id, placement, payment_reference, amount_paid } = req.body;
    if (!package_id) return res.status(400).json({ success: false, error: 'package_id is required' });

    const pkg = db.prepare('SELECT * FROM ranking_packages WHERE id=? AND is_active=1').get(package_id) as any;
    if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });

    // If product ranking, verify product ownership
    if (pkg.type === 'product_ranking' && product_id) {
      const product = db.prepare('SELECT id FROM products WHERE id=? AND vendor_id=?').get(product_id, vendor.id);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found or not owned by you' });
    }

    const rankId = uuidv4();
    db.prepare(`
      INSERT INTO vendor_rankings (id, vendor_id, product_id, package_id, type, placement, amount_paid, payment_reference, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment')
    `).run(rankId, vendor.id, product_id||null, package_id, pkg.type, placement||'all', amount_paid||pkg.price, payment_reference||null);

    // If payment_reference provided, mark as pending admin approval
    if (payment_reference) {
      db.prepare(`UPDATE vendor_rankings SET status='pending_approval' WHERE id=?`).run(rankId);
    }

    // Notify admins of new application
    const admins = db.prepare(`SELECT id FROM users WHERE role='admin'`).all() as any[];
    for (const admin of admins) {
      createNotification(db, admin.id, 'ranking_application',
        `📈 New Ranking Application`,
        `${vendor.store_name} applied for ${pkg.name} (${pkg.type.replace('_', ' ')}). ${payment_reference ? 'Payment reference submitted.' : 'Awaiting payment.'}`,
        { ranking_id: rankId, vendor_id: vendor.id, package_id, payment_reference }
      );
    }

    return res.json({
      success: true,
      message: `Ranking application submitted${payment_reference ? '. Awaiting admin approval.' : '. Please complete payment.'}`,
      data: { id: rankId, package: pkg, status: payment_reference ? 'pending_approval' : 'pending_payment' }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/ranking/my ──────────────────────────────────────────────────── */
router.get('/my', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Vendors only' });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id=?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const rankings = db.prepare(`
      SELECT vr.*, rp.name as package_name, rp.features, rp.badge_icon, rp.priority_level,
             p.name as product_name
      FROM vendor_rankings vr
      JOIN ranking_packages rp ON vr.package_id = rp.id
      LEFT JOIN products p ON vr.product_id = p.id
      WHERE vr.vendor_id=?
      ORDER BY vr.created_at DESC
    `).all(vendor.id) as any[];

    return res.json({ success: true, data: rankings.map(r => ({ ...r, features: JSON.parse(r.features || '[]') })) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/ranking/admin ───────────────────────────────────────────────── */
router.get('/admin', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();
    const { status } = req.query as Record<string, string>;

    let q = `
      SELECT vr.*, rp.name as package_name, rp.features, rp.badge_icon, rp.price as package_price,
             v.store_name, v.city as vendor_city,
             u.name as vendor_user_name, u.email as vendor_email,
             p.name as product_name
      FROM vendor_rankings vr
      JOIN ranking_packages rp ON vr.package_id = rp.id
      JOIN vendors v ON vr.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN products p ON vr.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { q += ` AND vr.status=?`; params.push(status); }
    q += ` ORDER BY vr.created_at DESC`;

    const rankings = db.prepare(q).all(...params) as any[];
    return res.json({ success: true, data: rankings.map(r => ({ ...r, features: JSON.parse(r.features || '[]') })) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUT /api/ranking/admin/:id ───────────────────────────────────────────── */
router.put('/admin/:id', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const db = getDB();

    const ranking = db.prepare(`
      SELECT vr.*, rp.duration_days, rp.name as pkg_name, rp.type as pkg_type,
             v.user_id as vendor_user_id, v.store_name
      FROM vendor_rankings vr
      JOIN ranking_packages rp ON vr.package_id = rp.id
      JOIN vendors v ON vr.vendor_id = v.id
      WHERE vr.id=?
    `).get(id) as any;
    if (!ranking) return res.status(404).json({ success: false, error: 'Ranking not found' });

    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (status === 'active') {
      startDate = now.toISOString();
      const end = new Date(now.getTime() + ranking.duration_days * 24 * 60 * 60 * 1000);
      endDate = end.toISOString();

      // Update vendor/product ranking flags
      if (ranking.pkg_type === 'vendor_ranking') {
        db.prepare(`UPDATE vendors SET is_featured=1, ranking_level=?, updated_at=datetime('now') WHERE id=?`).run(ranking.pkg_name, ranking.vendor_id);
      }
      if (ranking.pkg_type === 'product_ranking' && ranking.product_id) {
        db.prepare(`UPDATE products SET is_ranked=1, is_featured=1, rank_expires_at=?, updated_at=datetime('now') WHERE id=?`).run(endDate, ranking.product_id);
      }
    }

    db.prepare(`
      UPDATE vendor_rankings SET status=?, admin_approved=?, approved_by=?,
        start_date=COALESCE(?, start_date), end_date=COALESCE(?, end_date), notes=?
      WHERE id=?
    `).run(status, status === 'active' ? 1 : 0, auth.user.userId, startDate, endDate, notes||null, id);

    // Notify vendor
    const msgs: Record<string, { title: string, msg: string }> = {
      active: { title: '🚀 Ranking Activated!', msg: `Your ${ranking.pkg_name} ranking has been activated. Your ${ranking.product_id ? 'product' : 'store'} is now featured!` },
      cancelled: { title: '❌ Ranking Cancelled', msg: `Your ranking application for ${ranking.pkg_name} has been cancelled. ${notes || ''}` },
      rejected: { title: '❌ Ranking Rejected', msg: `Your ranking request for ${ranking.pkg_name} was not approved. ${notes || 'Contact support for details.'}` },
    };
    if (msgs[status]) {
      createNotification(db, ranking.vendor_user_id, `ranking_${status}`, msgs[status].title, msgs[status].msg, { ranking_id: id });
    }

    return res.json({ success: true, message: `Ranking ${status}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/ranking/active ──────────────────────────────────────────────── */
router.get('/active', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { type, placement } = req.query as Record<string, string>;

    let q = `
      SELECT vr.*, rp.badge_icon, rp.priority_level, rp.name as pkg_name,
             v.store_name, v.logo, v.city, v.rating, v.category,
             p.name as product_name, p.price, p.images, p.rating as product_rating
      FROM vendor_rankings vr
      JOIN ranking_packages rp ON vr.package_id = rp.id
      JOIN vendors v ON vr.vendor_id = v.id
      LEFT JOIN products p ON vr.product_id = p.id
      WHERE vr.status='active' AND vr.admin_approved=1
        AND (vr.end_date IS NULL OR datetime(vr.end_date) > datetime('now'))
    `;
    const params: any[] = [];
    if (type) { q += ` AND vr.type=?`; params.push(type); }
    if (placement) { q += ` AND (vr.placement=? OR vr.placement='all')`; params.push(placement); }
    q += ` ORDER BY rp.priority_level DESC`;

    const rankings = db.prepare(q).all(...params) as any[];
    return res.json({
      success: true,
      data: rankings.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] }))
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── POST /api/ranking/notify-ready ───────────────────────────────────────── */
// Vendor notifies that an order is ready for pickup or delivery
router.post('/notify-ready', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Only vendors can send readiness notifications' });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id=?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    const { order_id, ready_type, message } = req.body; // ready_type: 'pickup' | 'delivery'
    if (!order_id || !ready_type) {
      return res.status(400).json({ success: false, error: 'order_id and ready_type are required' });
    }

    const order = db.prepare(`
      SELECT o.*, u.name as customer_name
      FROM orders o JOIN users u ON o.customer_id = u.id
      WHERE o.id=? AND o.vendor_id=?
    `).get(order_id, vendor.id) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // Update order ready flags
    const field = ready_type === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery';
    db.prepare(`UPDATE orders SET ${field}=1, vendor_ready_notified=1, ready_notified_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(order_id);

    // Notify customer
    const readyMsg = ready_type === 'pickup'
      ? `Your order #${order_id.slice(0,8).toUpperCase()} is ready for pickup at ${vendor.store_name}! Please collect at your earliest convenience.`
      : `Great news! ${vendor.store_name} has confirmed your order #${order_id.slice(0,8).toUpperCase()} is ready for delivery. You'll receive it soon.`;

    createNotification(db, order.customer_id, `order_ready_${ready_type}`,
      ready_type === 'pickup' ? '📦 Ready for Pickup!' : '🚚 Out for Delivery!',
      message || readyMsg,
      { order_id, vendor_id: vendor.id, store_name: vendor.store_name, ready_type }
    );

    // Notify admin
    const admins = db.prepare(`SELECT id FROM users WHERE role='admin'`).all() as any[];
    for (const admin of admins) {
      createNotification(db, admin.id, `vendor_ready_notified`,
        `📦 Vendor Order Ready`,
        `${vendor.store_name} marked order #${order_id.slice(0,8).toUpperCase()} as ready for ${ready_type}.`,
        { order_id, vendor_id: vendor.id, customer_id: order.customer_id, ready_type }
      );
    }

    return res.json({ success: true, message: `Customer notified: order ready for ${ready_type}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── GET /api/ranking/lama-recommendations ────────────────────────────────── */
// LAMA-powered ranking recommendations for admin
router.get('/lama-recommendations', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = getDB();

    // Top selling vendors not currently ranked
    const topVendors = db.prepare(`
      SELECT v.id, v.store_name, v.city, v.rating, v.total_sales, v.category,
             COUNT(o.id) as recent_orders,
             COALESCE((SELECT 1 FROM vendor_rankings vr WHERE vr.vendor_id=v.id AND vr.status='active'), 0) as is_ranked
      FROM vendors v
      LEFT JOIN orders o ON v.id = o.vendor_id AND o.created_at > datetime('now', '-30 days')
      WHERE v.status='approved'
      GROUP BY v.id
      ORDER BY recent_orders DESC, v.rating DESC
      LIMIT 10
    `).all() as any[];

    // Top products with high demand not currently ranked
    const topProducts = db.prepare(`
      SELECT p.id, p.name, p.price, p.rating, p.total_sales, p.stock,
             v.store_name, v.city,
             COUNT(oi.id) as recent_orders,
             COALESCE(p.is_ranked, 0) as is_ranked
      FROM products p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at > datetime('now', '-30 days')
      WHERE p.is_active=1 AND v.status='approved'
      GROUP BY p.id
      ORDER BY recent_orders DESC, p.rating DESC
      LIMIT 10
    `).all() as any[];

    // Vendors with pending ranking applications
    const pendingApplications = db.prepare(`
      SELECT vr.*, v.store_name, v.city, rp.name as pkg_name, rp.price as pkg_price,
             u.name as vendor_owner_name
      FROM vendor_rankings vr
      JOIN vendors v ON vr.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      JOIN ranking_packages rp ON vr.package_id = rp.id
      WHERE vr.status IN ('pending_approval', 'pending_payment')
      ORDER BY vr.created_at DESC
      LIMIT 20
    `).all();

    const recommendations = [
      ...topVendors.filter(v => !v.is_ranked).slice(0, 5).map(v => ({
        type: 'vendor_ranking',
        entity_id: v.id,
        entity_name: v.store_name,
        reason: `🔥 High demand: ${v.recent_orders} orders in last 30 days, rating ${v.rating}/5`,
        city: v.city,
        metric: v.recent_orders,
        lama_score: Math.min(100, (v.recent_orders * 5) + (v.rating * 10)),
        suggested_package: v.recent_orders > 20 ? 'pkg-gold-vendor' : 'pkg-silver-vendor'
      })),
      ...topProducts.filter(p => !p.is_ranked).slice(0, 5).map(p => ({
        type: 'product_ranking',
        entity_id: p.id,
        entity_name: p.name,
        reason: `📦 Top seller: ${p.recent_orders} purchases in last 30 days, from ${p.store_name}`,
        city: p.city,
        metric: p.recent_orders,
        lama_score: Math.min(100, (p.recent_orders * 5) + (p.rating * 10)),
        suggested_package: p.recent_orders > 20 ? 'pkg-gold-product' : 'pkg-silver-product'
      }))
    ].sort((a, b) => b.lama_score - a.lama_score);

    return res.json({
      success: true,
      data: {
        recommendations,
        pending_applications: pendingApplications,
        summary: {
          total_recommendations: recommendations.length,
          top_city: topVendors[0]?.city || 'Lagos',
          avg_demand_score: recommendations.reduce((s, r) => s + r.lama_score, 0) / Math.max(1, recommendations.length)
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
