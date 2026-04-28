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

/* ── GET /api/lama/price-suggestions ─────────────────────────────────────── */
/**
 * LAMA Price Intelligence: suggests optimal price for a product.
 * Uses comparable products in same category to compute fair price range.
 * Vendor only. Query: ?product_id=<id> or ?category_id=<id>&price=<current>
 */
router.get('/price-suggestions', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access required' });
  }

  const db          = getDB();
  const product_id  = req.query.product_id  as string;
  const category_id = req.query.category_id as string;
  const current     = parseFloat(req.query.price as string) || 0;

  let catId = category_id;
  let currentPrice = current;
  let productName = '';

  if (product_id) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
    if (!prod) return res.status(404).json({ success: false, error: 'Product not found' });
    catId        = prod.category_id;
    currentPrice = prod.price;
    productName  = prod.name;
  }

  if (!catId) return res.status(400).json({ success: false, error: 'product_id or category_id required' });

  /* Comparable products in same category */
  const comparables = db.prepare(`
    SELECT p.price, p.rating, p.total_sales, p.name
    FROM products p WHERE p.category_id = ? AND p.is_active = 1 AND p.price > 0
    ${product_id ? 'AND p.id != ?' : ''}
    ORDER BY p.total_sales DESC LIMIT 20
  `).all(...(product_id ? [catId, product_id] : [catId])) as any[];

  if (!comparables.length) {
    return res.json({ success: true, data: { message: 'Not enough data for price analysis yet', suggestions: [] } });
  }

  const prices      = comparables.map(p => p.price);
  const avg         = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice    = Math.min(...prices);
  const maxPrice    = Math.max(...prices);
  const median      = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  /* Top-selling products pricing */
  const topSellers  = comparables.filter(p => p.total_sales > 0).sort((a, b) => b.total_sales - a.total_sales).slice(0, 5);
  const topAvg      = topSellers.length ? topSellers.reduce((s, p) => s + p.price, 0) / topSellers.length : avg;

  /* Determine price position */
  let pricePosition = 'competitive';
  let suggestion    = '';
  let recommendedMin = Math.round(avg * 0.85);
  let recommendedMax = Math.round(avg * 1.15);

  if (currentPrice > 0) {
    if (currentPrice > maxPrice * 0.9)      { pricePosition = 'premium'; suggestion = `Your price is in the premium range. Consider offering added value (warranty, free delivery) to justify it.`; }
    else if (currentPrice < minPrice * 1.1) { pricePosition = 'budget';  suggestion = `Your price is very competitive. You could increase by 10-15% and still attract buyers.`; }
    else                                     { pricePosition = 'optimal'; suggestion = `Your price is well-positioned in the market range.`; }
  }

  const analysis = {
    product_name:    productName,
    current_price:   currentPrice,
    price_position:  pricePosition,
    market_data: {
      min_price:     minPrice,
      max_price:     maxPrice,
      average_price: Math.round(avg),
      median_price:  Math.round(median),
      top_seller_avg: Math.round(topAvg),
      sample_size:   comparables.length,
    },
    recommended_range: { min: recommendedMin, max: recommendedMax },
    suggestion,
    lama_insight: currentPrice > 0
      ? generateInsight('recommendation', { budget: currentPrice, product_name: productName || 'your product', price: Math.round(avg), vendor_name: 'similar vendors' })
      : `💡 Based on ${comparables.length} comparable products, the market average is ₦${Math.round(avg).toLocaleString()}. Price between ₦${recommendedMin.toLocaleString()} and ₦${recommendedMax.toLocaleString()} for best results.`,
    top_sellers: topSellers.slice(0, 3).map(p => ({ name: p.name, price: p.price, sales: p.total_sales })),
  };

  return res.json({ success: true, data: analysis });
});

/* ── GET /api/lama/demand-forecast ───────────────────────────────────────── */
/**
 * LAMA Demand Forecasting: predicts demand for a product/category.
 * Uses historical order data and seasonal patterns.
 */
router.get('/demand-forecast', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || !['vendor', 'admin'].includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Vendor or admin access required' });
  }

  const db          = getDB();
  const product_id  = req.query.product_id  as string;
  const category_id = req.query.category_id as string;

  let historical: any[] = [];
  let targetName         = '';

  if (product_id) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
    if (!prod) return res.status(404).json({ success: false, error: 'Product not found' });
    targetName  = prod.name;

    historical = db.prepare(`
      SELECT date(o.created_at) as day, COUNT(oi.id) as orders, SUM(oi.quantity) as units
      FROM order_items oi JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.created_at >= datetime('now', '-90 days')
      GROUP BY day ORDER BY day ASC
    `).all(product_id) as any[];
  } else if (category_id) {
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id) as any;
    targetName = cat?.name || 'Category';

    historical = db.prepare(`
      SELECT date(o.created_at) as day, COUNT(oi.id) as orders, SUM(oi.quantity) as units
      FROM order_items oi JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE p.category_id = ? AND o.created_at >= datetime('now', '-90 days')
      GROUP BY day ORDER BY day ASC
    `).all(category_id) as any[];
  } else {
    return res.status(400).json({ success: false, error: 'product_id or category_id required' });
  }

  /* Simple moving average forecast */
  const totalDays   = historical.length;
  const totalOrders = historical.reduce((s, d) => s + d.orders, 0);
  const totalUnits  = historical.reduce((s, d) => s + (d.units || 0), 0);
  const avgPerDay   = totalDays > 0 ? totalOrders / totalDays : 0;
  const avgUnitsDay = totalDays > 0 ? totalUnits  / totalDays : 0;

  /* Recent 7-day trend vs previous 7-day */
  const recent7  = historical.slice(-7).reduce((s, d) => s + d.orders, 0);
  const prev7    = historical.slice(-14, -7).reduce((s, d) => s + d.orders, 0);
  const trendPct = prev7 > 0 ? Math.round(((recent7 - prev7) / prev7) * 100) : 0;

  /* 7-day and 30-day forecast using trend-adjusted average */
  const trendFactor    = 1 + (trendPct / 100) * 0.5; // dampen the trend
  const forecast7day   = Math.round(avgPerDay * 7  * trendFactor);
  const forecast30day  = Math.round(avgPerDay * 30 * trendFactor);
  const unitsForecast7 = Math.round(avgUnitsDay * 7  * trendFactor);

  /* Stock recommendation */
  const currentStock   = product_id ? (db.prepare('SELECT stock FROM products WHERE id = ?').get(product_id) as any)?.stock || 0 : 0;
  const stockSufficient = currentStock >= unitsForecast7;

  const forecast = {
    target:       targetName,
    data_points:  totalDays,
    historical_summary: {
      total_orders:  totalOrders,
      total_units:   totalUnits,
      avg_orders_per_day: Math.round(avgPerDay * 10) / 10,
    },
    trend: {
      recent_7_days:  recent7,
      previous_7_days: prev7,
      trend_pct:      trendPct,
      direction:      trendPct > 5 ? 'rising' : trendPct < -5 ? 'falling' : 'stable',
    },
    forecast: {
      next_7_days_orders: forecast7day,
      next_7_days_units:  unitsForecast7,
      next_30_days_orders: forecast30day,
    },
    stock_analysis: product_id ? {
      current_stock: currentStock,
      units_needed_7d: unitsForecast7,
      sufficient: stockSufficient,
      recommendation: stockSufficient
        ? `✅ Stock is sufficient for the next 7 days.`
        : `⚠️ Consider restocking. Forecasted demand: ${unitsForecast7} units in 7 days, current stock: ${currentStock}.`,
    } : null,
    lama_insight: `📈 "${targetName}": ${trendPct > 0 ? '↑ Rising' : trendPct < 0 ? '↓ Falling' : '→ Stable'} demand (${trendPct > 0 ? '+' : ''}${trendPct}% vs last week). Forecast: ~${forecast7day} orders in the next 7 days.`,
  };

  return res.json({ success: true, data: forecast });
});

/* ── GET /api/lama/budget-suggestions ────────────────────────────────────── */
/**
 * LAMA Budget Planner Suggestions:
 * Given a budget amount (₦) and optional category, returns a curated list
 * of products whose COMBINED total equals (or best approximates) that budget.
 *
 * Strategy: greedy fill — sort by value-score desc, then pick items until
 *           the budget is (nearly) exhausted or we run out of products.
 *
 * Query params:
 *   budget   – total budget in NGN (required)
 *   category – category name filter (optional, 'random' or empty = all)
 *   city     – city filter (optional)
 *   max_items – max number of items to suggest (default 10)
 */
router.get('/budget-suggestions', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const budget    = parseFloat(req.query.budget   as string || '0');
  const category  = req.query.category as string | undefined;
  const city      = req.query.city     as string | undefined;
  const maxItems  = Math.min(parseInt(req.query.max_items as string || '10'), 20);

  if (!budget || budget <= 0) {
    return res.status(400).json({ success: false, error: 'A positive budget amount is required' });
  }

  const db = getDB();

  /* Build query – filter by category (unless 'random'/absent) and city */
  const isRandom = !category || category.toLowerCase() === 'random';
  const params: any[] = [];

  let pQuery = `
    SELECT p.id, p.name, p.price, p.stock, p.rating, p.total_sales, p.images,
           v.store_name, v.city AS vendor_city, c.name AS category_name
    FROM products p
    JOIN vendors v ON p.vendor_id = v.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND v.status = 'approved'
      AND p.price > 0 AND p.price <= ? AND p.stock > 0
  `;
  params.push(budget);

  if (!isRandom && category) {
    pQuery += ` AND LOWER(c.name) LIKE LOWER(?)`;
    params.push(`%${category}%`);
  }
  if (city) {
    pQuery += ` AND LOWER(v.city) LIKE LOWER(?)`;
    params.push(`%${city}%`);
  }

  // Order by value score: (rating * total_sales + 1) / price  desc → best bang for buck
  pQuery += ` ORDER BY (p.rating * (p.total_sales + 1)) / p.price DESC, p.rating DESC LIMIT 100`;

  const allProducts = (db.prepare(pQuery).all(...params) as any[]).map(p => ({
    ...p,
    images: (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })(),
  }));

  /* ── Greedy knapsack fill ────────────────────────────────────────────── */
  /* Allow multiple items from same vendor, but prioritise variety */
  let remaining = budget;
  const selected: any[] = [];
  const usedIds  = new Set<string>();

  /* Pass 1 – pick highest-value items that fit */
  for (const p of allProducts) {
    if (selected.length >= maxItems) break;
    if (p.price <= remaining && !usedIds.has(p.id)) {
      selected.push({ ...p, quantity: 1 });
      remaining = parseFloat((remaining - p.price).toFixed(2));
      usedIds.add(p.id);
    }
  }

  /* Pass 2 – if budget still remains, try to add quantity to cheapest items */
  if (remaining > 0 && selected.length > 0) {
    for (const item of [...selected].sort((a, b) => a.price - b.price)) {
      const extra = Math.min(
        Math.floor(remaining / item.price),
        (item.stock || 1) - item.quantity
      );
      if (extra > 0) {
        item.quantity += extra;
        remaining = parseFloat((remaining - item.price * extra).toFixed(2));
      }
    }
  }

  const totalCost  = parseFloat((budget - remaining).toFixed(2));
  const coverage   = budget > 0 ? Math.round((totalCost / budget) * 100) : 0;

  /* LAMA narrative */
  const lamaMessage = selected.length > 0
    ? `🛍️ With ₦${budget.toLocaleString()}, LAMA selected ${selected.length} item(s) worth ₦${totalCost.toLocaleString()} (${coverage}% of your budget)${remaining > 0 ? `. You'll have ₦${remaining.toLocaleString()} left over.` : ', using your full budget!'}`
    : `😔 No products found within ₦${budget.toLocaleString()}${category && !isRandom ? ` in the "${category}" category` : ''}. Try a higher budget or a different category.`;

  return res.json({
    success: true,
    data: {
      budget,
      category: isRandom ? 'all' : category,
      city: city || 'all',
      selected_items: selected,
      total_cost:     totalCost,
      remaining:      remaining,
      coverage_pct:   coverage,
      item_count:     selected.length,
      lama_message:   lamaMessage,
    },
  });
});

/* ── Export the analysis runner so server.ts can schedule it ──────────────── */
export { runLamaAnalysis };
export default router;
