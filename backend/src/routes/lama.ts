/**
 * ─── LAMA AI Agent Routes ─────────────────────────────────────────────────────
 * LAMA (LastMart Automated Market Agent) is the platform's built-in AI agent.
 *
 * Responsibilities:
 *   1. Studies the entire system (orders, products, vendors, budgets)
 *   2. Gives the admin updates on marketplace issues
 *   3. Surfaces market/product trends to admin, vendors and customers
 *   4. Tracks recurring purchases for customers
 *   5. Recommends products/vendors that fit a customer's budget
 *   6. Notifies users of trending and upcoming products
 *
 * All intelligence runs locally (no internet required).
 * Plug in OpenAI / Gemini by replacing the generateInsight() stub with a
 * real API call – the rest of the code stays the same.
 *
 * Endpoints:
 *   GET  /api/lama/insights          – Get LAMA insights for the current user
 *   GET  /api/lama/dashboard         – LAMA admin dashboard summary
 *   GET  /api/lama/recommend         – Product/vendor recommendations for budget
 *   GET  /api/lama/trends            – Market trend data
 *   POST /api/lama/run               – Trigger a full LAMA analysis cycle (admin)
 *   PUT  /api/lama/insights/:id/read – Mark an insight as read
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest, requireAuth } from '../lib/auth';

const router = Router();

/* ─────────────────────────────────────────────────────────────
   Local intelligence helpers (no internet required)
   ───────────────────────────────────────────────────────────── */

/**
 * Generates a human-readable insight from platform data.
 * In production: replace body with an OpenAI / Gemini API call.
 *
 * @param type     – category of insight
 * @param context  – data context object to base the insight on
 */
function generateInsight(type: string, context: Record<string, any>): string {
  /* Rule-based local generation – always works offline */
  switch (type) {
    case 'low_stock':
      return `⚠️ ${context.product_name} is running low (${context.stock} units left). Consider restocking before the next peak period.`;

    case 'top_seller':
      return `🔥 "${context.product_name}" from ${context.vendor_name} has sold ${context.total_sales} units this month – currently trending!`;

    case 'budget_overrun':
      return `💸 You've spent ₦${Number(context.spent).toLocaleString()} of your ₦${Number(context.budget).toLocaleString()} ${context.period} budget (${context.pct}%). Consider reviewing your recurring purchases.`;

    case 'vendor_pending':
      return `🏪 ${context.count} vendor${context.count > 1 ? 's' : ''} are awaiting approval. Review them in the admin dashboard.`;

    case 'high_demand':
      return `📈 "${context.category}" category is surging this week with ${context.order_count} orders – a great time to feature vendors in this space.`;

    case 'recommendation':
      return `✨ Based on your budget of ₦${Number(context.budget).toLocaleString()}, we recommend "${context.product_name}" (₦${Number(context.price).toLocaleString()}) from ${context.vendor_name} – great value!`;

    case 'recurring_due':
      return `🔄 Your recurring purchase of "${context.product_name}" is due on ${context.date}. Ensure your cart and payment method are ready.`;

    case 'platform_health':
      return `📊 Platform summary: ${context.total_orders} orders | ${context.active_vendors} active vendors | ₦${Number(context.total_revenue).toLocaleString()} total revenue | ${context.pending_vendors} vendors pending approval.`;

    default:
      return `📌 LastMart insight: ${JSON.stringify(context)}`;
  }
}

/**
 * Core LAMA analysis engine.
 * Reads the database, detects patterns, and writes lama_insights rows.
 * Called by /api/lama/run and also on every server start (via cron-style init).
 */
function runLamaAnalysis(): { inserted: number; summary: string[] } {
  const db      = getDB();
  const now     = new Date().toISOString();
  const summary: string[] = [];
  let   inserted = 0;

  const insert = (type: string, role: string, userId: string | null, title: string, body: string, data: object = {}) => {
    db.prepare(`INSERT INTO lama_insights (id, type, target_role, target_user_id, title, body, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), type, role, userId, title, body, JSON.stringify(data), now);
    inserted++;
  };

  /* 1. Platform health summary → admin */
  const stats = db.prepare(`SELECT
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM vendors WHERE status='approved') as active_vendors,
    (SELECT COUNT(*) FROM vendors WHERE status='pending')  as pending_vendors,
    (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='completed') as total_revenue,
    (SELECT COUNT(*) FROM users WHERE role='customer') as total_customers
  `).get() as any;

  const healthMsg = generateInsight('platform_health', stats);
  insert('admin_alert', 'admin', null, '📊 Daily Platform Health', healthMsg, stats);
  summary.push('Platform health → admin');

  /* 2. Pending vendor approvals → admin */
  if (stats.pending_vendors > 0) {
    const msg = generateInsight('vendor_pending', { count: stats.pending_vendors });
    insert('admin_alert', 'admin', null, '🏪 Pending Vendor Approvals', msg, { count: stats.pending_vendors });
    summary.push(`${stats.pending_vendors} pending vendors → admin`);
  }

  /* 3. Low-stock products → each vendor */
  const lowStock = db.prepare(`
    SELECT p.id, p.name, p.stock, v.user_id, v.store_name
    FROM products p JOIN vendors v ON p.vendor_id = v.id
    WHERE p.stock < 5 AND p.is_active = 1
  `).all() as any[];

  for (const p of lowStock) {
    const msg = generateInsight('low_stock', { product_name: p.name, stock: p.stock });
    insert('admin_alert', 'vendor', p.user_id, '⚠️ Low Stock Alert', msg, { product_id: p.id, stock: p.stock });
    summary.push(`Low stock: ${p.name}`);
  }

  /* 4. Top-selling products → broadcast to all */
  const topSellers = db.prepare(`
    SELECT p.id, p.name, p.total_sales, v.store_name
    FROM products p JOIN vendors v ON p.vendor_id = v.id
    WHERE p.total_sales > 0 AND p.is_active = 1
    ORDER BY p.total_sales DESC LIMIT 3
  `).all() as any[];

  for (const p of topSellers) {
    const msg = generateInsight('top_seller', { product_name: p.name, total_sales: p.total_sales, vendor_name: p.store_name });
    insert('market_trend', 'all', null, '🔥 Trending Product', msg, { product_id: p.id });
    summary.push(`Trending: ${p.name}`);
  }

  /* 5. Category demand trends → admin */
  const catDemand = db.prepare(`
    SELECT c.name, COUNT(oi.id) as order_count
    FROM order_items oi
    JOIN products p    ON oi.product_id = p.id
    JOIN categories c  ON p.category_id = c.id
    GROUP BY c.id ORDER BY order_count DESC LIMIT 2
  `).all() as any[];

  for (const c of catDemand) {
    const msg = generateInsight('high_demand', { category: c.name, order_count: c.order_count });
    insert('market_trend', 'admin', null, '📈 Category Trend', msg, { category: c.name, orders: c.order_count });
    summary.push(`Trend: ${c.name} (${c.order_count} orders)`);
  }

  /* 6. Budget overrun alerts → each customer */
  const budgets = db.prepare(`SELECT * FROM budget_plans WHERE is_active = 1`).all() as any[];
  for (const b of budgets) {
    const pct = b.total_budget > 0 ? Math.round((b.spent / b.total_budget) * 100) : 0;
    if (pct >= 80) {
      const msg = generateInsight('budget_overrun', { spent: b.spent, budget: b.total_budget, period: b.period, pct });
      insert('admin_alert', 'customer', b.user_id, '💸 Budget Alert', msg, { plan_id: b.id, pct });
      summary.push(`Budget alert: ${b.name} (${pct}% used)`);
    }
  }

  /* 7. Recurring purchase reminders → each customer */
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dueRecs  = db.prepare(`
    SELECT rp.*, p.name AS product_name
    FROM recurring_purchases rp JOIN products p ON rp.product_id = p.id
    WHERE rp.is_active = 1 AND rp.next_order_date <= ?
  `).all(tomorrow.toISOString()) as any[];

  for (const r of dueRecs) {
    const date = r.next_order_date.split('T')[0];
    const msg  = generateInsight('recurring_due', { product_name: r.product_name, date });
    insert('recommendation', 'customer', r.user_id, '🔄 Recurring Purchase Due', msg, { recurring_id: r.id, date });
    summary.push(`Recurring due: ${r.product_name} on ${date}`);
  }

  return { inserted, summary };
}

/* ─────────────────────────────────────────────────────────────
   Route handlers
   ───────────────────────────────────────────────────────────── */

/* ── GET /api/lama/insights ───────────────────────────────────────────────── */
/**
 * Returns LAMA insights relevant to the current user's role.
 * - admin  → all admin insights + market trends
 * - vendor → vendor alerts + market trends
 * - customer → customer recommendations + market trends
 */
router.get('/insights', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db      = getDB();
  const limit   = parseInt(req.query.limit as string || '20');
  const unread  = req.query.unread === 'true';

  /* Fetch insights that target this user's role or this specific user */
  let query = `SELECT * FROM lama_insights
    WHERE (target_user_id = ? OR target_user_id IS NULL)
      AND (target_role = ? OR target_role = 'all')
    ${unread ? 'AND is_read = 0' : ''}
    ORDER BY created_at DESC LIMIT ?`;

  const insights = db.prepare(query).all(user.userId, user.role, limit) as any[];
  const unread_count = (db.prepare(`SELECT COUNT(*) as n FROM lama_insights
    WHERE (target_user_id = ? OR target_user_id IS NULL)
      AND (target_role = ? OR target_role = 'all') AND is_read = 0`).get(user.userId, user.role) as any).n;

  return res.json({
    success: true,
    data: insights.map(i => ({ ...i, data: JSON.parse(i.data || '{}') })),
    unread_count
  });
});

/* ── GET /api/lama/dashboard ──────────────────────────────────────────────── */
/**
 * Returns a compact LAMA dashboard for the admin:
 * live platform stats, top issues, and recent insights.
 */
router.get('/dashboard', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  const db = getDB();

  /* Live platform stats */
  const stats = db.prepare(`SELECT
    (SELECT COUNT(*) FROM users WHERE role='customer') as customers,
    (SELECT COUNT(*) FROM vendors WHERE status='approved') as active_vendors,
    (SELECT COUNT(*) FROM vendors WHERE status='pending')  as pending_vendors,
    (SELECT COUNT(*) FROM products WHERE is_active=1)      as products,
    (SELECT COUNT(*) FROM orders)                          as total_orders,
    (SELECT COUNT(*) FROM orders WHERE status='pending')   as pending_orders,
    (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='completed') as total_revenue,
    (SELECT COUNT(*) FROM orders WHERE date(created_at)=date('now')) as today_orders
  `).get() as any;

  /* Top 5 low-stock products */
  const issues = db.prepare(`
    SELECT p.name, p.stock, v.store_name FROM products p JOIN vendors v ON p.vendor_id = v.id
    WHERE p.stock < 5 AND p.is_active = 1 ORDER BY p.stock ASC LIMIT 5
  `).all();

  /* Latest 10 LAMA insights for admin */
  const recent = db.prepare(`SELECT * FROM lama_insights WHERE target_role IN ('admin','all') ORDER BY created_at DESC LIMIT 10`).all() as any[];

  /* Revenue trend: last 6 months */
  const revenueTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total_amount) as revenue
    FROM orders WHERE payment_status='completed' GROUP BY month ORDER BY month DESC LIMIT 6
  `).all();

  return res.json({
    success: true,
    data: {
      stats, issues, revenueTrend,
      recent_insights: recent.map(i => ({ ...i, data: JSON.parse(i.data || '{}') }))
    }
  });
});

/* ── GET /api/lama/recommend ──────────────────────────────────────────────── */
/**
 * Returns personalized product and vendor recommendations for the current user.
 * Takes `budget` (NGN) as a query param and optionally `category`.
 *
 * Query: ?budget=10000&category=Electronics
 */
router.get('/recommend', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const budget   = parseFloat(req.query.budget as string || '0');
  const category = req.query.category as string | undefined;
  const city     = req.query.city     as string | undefined;

  const db = getDB();

  /* Products within budget */
  let pQuery = `SELECT p.*, v.store_name, v.city AS vendor_city, c.name AS category_name
    FROM products p JOIN vendors v ON p.vendor_id = v.id LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND v.status = 'approved'
    ${budget > 0 ? 'AND p.price <= ?' : ''}
    ${category ? "AND c.name LIKE ?" : ''}
    ${city ? "AND LOWER(v.city) LIKE LOWER(?)" : ''}
    ORDER BY p.rating DESC, p.total_sales DESC LIMIT 10`;

  const pParams: any[] = [];
  if (budget > 0) pParams.push(budget);
  if (category)   pParams.push(`%${category}%`);
  if (city)       pParams.push(`%${city}%`);

  const products = (db.prepare(pQuery).all(...pParams) as any[]).map(p => ({
    ...p, images: JSON.parse(p.images || '[]'), tags: JSON.parse(p.tags || '[]')
  }));

  /* Vendors in budget-friendly range */
  const vendors = db.prepare(`
    SELECT v.*, COUNT(p.id) as product_count, MIN(p.price) as min_price
    FROM vendors v JOIN products p ON v.id = p.vendor_id
    WHERE v.status = 'approved' AND p.is_active = 1
    ${city ? "AND LOWER(v.city) LIKE LOWER(?)" : ''}
    ${budget > 0 ? "AND p.price <= ?" : ''}
    GROUP BY v.id ORDER BY v.rating DESC LIMIT 5`).all(
      ...[city ? `%${city}%` : [], budget > 0 ? budget : []].flat()
    );

  /* LAMA-generated recommendation insight for each top product */
  const insights = products.slice(0, 3).map(p =>
    generateInsight('recommendation', { budget, product_name: p.name, price: p.price, vendor_name: p.store_name })
  );

  return res.json({ success: true, data: { products, vendors, insights, budget, category } });
});

/* ── GET /api/lama/trends ─────────────────────────────────────────────────── */
/**
 * Returns market trend data derived from orders, products, and categories.
 * Useful for the trends feed shown to admins, vendors and customers.
 */
router.get('/trends', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();

  /* Top 5 products by sales volume */
  const topProducts = db.prepare(`
    SELECT p.id, p.name, p.total_sales, p.rating, p.price, p.images, v.store_name, c.name AS category_name
    FROM products p JOIN vendors v ON p.vendor_id = v.id LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 ORDER BY p.total_sales DESC LIMIT 5`).all() as any[];

  /* Category order distribution */
  const categoryTrends = db.prepare(`
    SELECT c.name, c.icon, COUNT(oi.id) as order_count
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.id ORDER BY order_count DESC`).all();

  /* Top vendors */
  const topVendors = db.prepare(`
    SELECT v.id, v.store_name, v.city, v.rating, v.total_sales, v.category
    FROM vendors v WHERE v.status = 'approved' ORDER BY v.total_sales DESC LIMIT 5`).all();

  /* Recent 7-day order trend */
  const orderTrend = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as orders, SUM(total_amount) as revenue
    FROM orders WHERE created_at >= datetime('now', '-7 days')
    GROUP BY day ORDER BY day ASC`).all();

  /* LAMA narrative for each category trend */
  const trendInsights = (categoryTrends as any[]).slice(0, 3).map(c =>
    generateInsight('high_demand', { category: c.name, order_count: c.order_count })
  );

  return res.json({
    success: true,
    data: {
      topProducts: topProducts.map(p => ({ ...p, images: JSON.parse(p.images || '[]') })),
      categoryTrends, topVendors, orderTrend, trendInsights
    }
  });
});

/* ── POST /api/lama/run ───────────────────────────────────────────────────── */
/**
 * Triggers a full LAMA analysis cycle.
 * Admin only. Generates fresh insights and notifications for all users.
 */
router.post('/run', (req: Request, res: Response) => {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const result = runLamaAnalysis();
    return res.json({
      success: true,
      message: `LAMA analysis complete. ${result.inserted} insights generated.`,
      data: result
    });
  } catch (err: any) {
    console.error('[LAMA] Analysis error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── PUT /api/lama/insights/:id/read ─────────────────────────────────────── */
/**
 * Marks a single LAMA insight as read for the current user.
 */
router.put('/insights/:id/read', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();
  db.prepare(`UPDATE lama_insights SET is_read = 1 WHERE id = ?`).run(req.params.id);
  return res.json({ success: true, message: 'Marked as read' });
});

/* ── Export the analysis runner so server.ts can schedule it ──────────────── */
export { runLamaAnalysis };
export default router;
