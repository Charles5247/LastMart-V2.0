/**
 * ─── Budget & Recurring Purchase Routes ──────────────────────────────────────
 * Lets customers set shopping budgets and schedule recurring purchases.
 *
 * Endpoints:
 *   GET    /api/budget/plans              – List the user's budget plans
 *   POST   /api/budget/plans              – Create a new budget plan
 *   PUT    /api/budget/plans/:id          – Update a budget plan
 *   DELETE /api/budget/plans/:id          – Delete a budget plan
 *   GET    /api/budget/recurring          – List recurring purchases
 *   POST   /api/budget/recurring          – Schedule a recurring purchase
 *   PUT    /api/budget/recurring/:id      – Update schedule
 *   DELETE /api/budget/recurring/:id      – Cancel a recurring purchase
 *   POST   /api/budget/recurring/:id/trigger – Manually trigger next purchase
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/* ─────────────────────────────────────────────────────────────
   BUDGET PLANS
   ───────────────────────────────────────────────────────────── */

/* ── GET /api/budget/plans ────────────────────────────────────────────────── */
/**
 * Returns all budget plans for the authenticated user, including
 * calculated spend % and remaining balance.
 */
router.get('/plans', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db    = getDB();
  const plans = db.prepare(`SELECT * FROM budget_plans WHERE user_id = ? ORDER BY created_at DESC`).all(user.userId) as any[];

  /* Enrich each plan with spend % and remaining */
  const enriched = plans.map(p => ({
    ...p,
    remaining:    parseFloat((p.total_budget - p.spent).toFixed(2)),
    spent_pct:    p.total_budget > 0 ? parseFloat(((p.spent / p.total_budget) * 100).toFixed(1)) : 0,
  }));

  return res.json({ success: true, data: enriched });
});

/* ── POST /api/budget/plans ───────────────────────────────────────────────── */
/**
 * Creates a new budget plan.
 *
 * Body: { name, total_budget, period, start_date, end_date?, notes? }
 */
router.post('/plans', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { name, total_budget, period, start_date, end_date, notes } = req.body;

  if (!name || !total_budget || !period || !start_date) {
    return res.status(400).json({ success: false, error: 'name, total_budget, period and start_date are required' });
  }

  if (!['daily', 'weekly', 'monthly', 'quarterly'].includes(period)) {
    return res.status(400).json({ success: false, error: 'period must be daily | weekly | monthly | quarterly' });
  }

  const db = getDB();
  const id = uuidv4();

  db.prepare(`INSERT INTO budget_plans
    (id, user_id, name, total_budget, period, start_date, end_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.userId, name, parseFloat(total_budget), period, start_date,
    end_date || null, notes || null
  );

  const plan = db.prepare('SELECT * FROM budget_plans WHERE id = ?').get(id);
  return res.status(201).json({ success: true, data: plan, message: 'Budget plan created' });
});

/* ── PUT /api/budget/plans/:id ────────────────────────────────────────────── */
/**
 * Updates a budget plan (name, total_budget, period, etc.).
 */
router.put('/plans/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db   = getDB();
  const plan = db.prepare('SELECT * FROM budget_plans WHERE id = ? AND user_id = ?').get(req.params.id, user.userId) as any;
  if (!plan) return res.status(404).json({ success: false, error: 'Budget plan not found' });

  const { name, total_budget, period, end_date, notes, is_active } = req.body;

  db.prepare(`UPDATE budget_plans SET
    name = ?, total_budget = ?, period = ?, end_date = ?, notes = ?, is_active = ?
    WHERE id = ?`).run(
    name         ?? plan.name,
    total_budget != null ? parseFloat(total_budget) : plan.total_budget,
    period       ?? plan.period,
    end_date     ?? plan.end_date,
    notes        ?? plan.notes,
    is_active    != null ? is_active : plan.is_active,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM budget_plans WHERE id = ?').get(req.params.id);
  return res.json({ success: true, data: updated, message: 'Budget plan updated' });
});

/* ── DELETE /api/budget/plans/:id ─────────────────────────────────────────── */
router.delete('/plans/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db   = getDB();
  const plan = db.prepare('SELECT * FROM budget_plans WHERE id = ? AND user_id = ?').get(req.params.id, user.userId);
  if (!plan) return res.status(404).json({ success: false, error: 'Budget plan not found' });

  db.prepare('DELETE FROM budget_plans WHERE id = ?').run(req.params.id);
  return res.json({ success: true, message: 'Budget plan deleted' });
});

/* ─────────────────────────────────────────────────────────────
   RECURRING PURCHASES
   ───────────────────────────────────────────────────────────── */

/**
 * Helper: Calculates the next order date based on frequency.
 * @param from – ISO date string to calculate from (defaults to now)
 */
function nextDate(frequency: string, from?: string): string {
  const base = from ? new Date(from) : new Date();
  switch (frequency) {
    case 'daily':     base.setDate(base.getDate() + 1);    break;
    case 'weekly':    base.setDate(base.getDate() + 7);    break;
    case 'monthly':   base.setMonth(base.getMonth() + 1);  break;
    case 'quarterly': base.setMonth(base.getMonth() + 3);  break;
  }
  return base.toISOString();
}

/* ── GET /api/budget/recurring ────────────────────────────────────────────── */
/**
 * Returns all recurring purchases for the current user, joined with
 * product and delivery address details.
 */
router.get('/recurring', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db   = getDB();
  const rows = db.prepare(`
    SELECT rp.*,
           p.name  AS product_name, p.price AS product_price, p.images AS product_images,
           v.store_name AS vendor_name, v.city AS vendor_city,
           da.label AS delivery_label, da.address AS delivery_address_text, da.city AS delivery_city,
           bp.name AS plan_name
    FROM recurring_purchases rp
    JOIN products p           ON rp.product_id          = p.id
    JOIN vendors  v           ON p.vendor_id             = v.id
    LEFT JOIN delivery_addresses da ON rp.delivery_address_id = da.id
    LEFT JOIN budget_plans       bp ON rp.budget_plan_id      = bp.id
    WHERE rp.user_id = ?
    ORDER BY rp.next_order_date ASC
  `).all(user.userId) as any[];

  const enriched = rows.map(r => ({
    ...r,
    product_images: JSON.parse(r.product_images || '[]'),
  }));

  return res.json({ success: true, data: enriched });
});

/* ── POST /api/budget/recurring ───────────────────────────────────────────── */
/**
 * Schedules a recurring purchase.
 *
 * Body:
 *   product_id, quantity, frequency ('daily'|'weekly'|'monthly'|'quarterly'),
 *   budget_plan_id (optional), delivery_address_id (optional),
 *   auto_order (0|1 – whether to auto-place the order), next_order_date (optional)
 */
router.post('/recurring', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { product_id, quantity = 1, frequency, budget_plan_id, delivery_address_id, auto_order = 0, next_order_date } = req.body;

  if (!product_id || !frequency) {
    return res.status(400).json({ success: false, error: 'product_id and frequency are required' });
  }
  if (!['daily', 'weekly', 'monthly', 'quarterly'].includes(frequency)) {
    return res.status(400).json({ success: false, error: 'frequency must be daily | weekly | monthly | quarterly' });
  }

  const db      = getDB();
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(product_id) as any;
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  const id         = uuidv4();
  const next_date  = next_order_date || nextDate(frequency);

  db.prepare(`INSERT INTO recurring_purchases
    (id, user_id, budget_plan_id, product_id, quantity, frequency,
     next_order_date, delivery_address_id, auto_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.userId, budget_plan_id || null, product_id,
    parseInt(quantity), frequency, next_date,
    delivery_address_id || null, auto_order ? 1 : 0
  );

  const created = db.prepare(`
    SELECT rp.*, p.name AS product_name, p.price AS product_price
    FROM recurring_purchases rp JOIN products p ON rp.product_id = p.id
    WHERE rp.id = ?`).get(id);

  return res.status(201).json({ success: true, data: created, message: 'Recurring purchase scheduled' });
});

/* ── PUT /api/budget/recurring/:id ───────────────────────────────────────── */
/**
 * Updates a recurring purchase (quantity, frequency, auto_order, etc.).
 */
router.put('/recurring/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db  = getDB();
  const rec = db.prepare('SELECT * FROM recurring_purchases WHERE id = ? AND user_id = ?').get(req.params.id, user.userId) as any;
  if (!rec) return res.status(404).json({ success: false, error: 'Recurring purchase not found' });

  const { quantity, frequency, delivery_address_id, auto_order, is_active, next_order_date } = req.body;

  db.prepare(`UPDATE recurring_purchases SET
    quantity = ?, frequency = ?, delivery_address_id = ?, auto_order = ?,
    is_active = ?, next_order_date = ?
    WHERE id = ?`).run(
    quantity             ?? rec.quantity,
    frequency            ?? rec.frequency,
    delivery_address_id  ?? rec.delivery_address_id,
    auto_order           != null ? (auto_order ? 1 : 0) : rec.auto_order,
    is_active            != null ? (is_active  ? 1 : 0) : rec.is_active,
    next_order_date      ?? rec.next_order_date,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM recurring_purchases WHERE id = ?').get(req.params.id);
  return res.json({ success: true, data: updated, message: 'Updated successfully' });
});

/* ── DELETE /api/budget/recurring/:id ─────────────────────────────────────── */
router.delete('/recurring/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db  = getDB();
  const rec = db.prepare('SELECT * FROM recurring_purchases WHERE id = ? AND user_id = ?').get(req.params.id, user.userId);
  if (!rec) return res.status(404).json({ success: false, error: 'Not found' });

  db.prepare('DELETE FROM recurring_purchases WHERE id = ?').run(req.params.id);
  return res.json({ success: true, message: 'Recurring purchase cancelled' });
});

/* ── POST /api/budget/recurring/:id/trigger ───────────────────────────────── */
/**
 * Manually triggers the next purchase in a recurring schedule.
 * Creates an order (in 'pending' state) for the associated product.
 */
router.post('/recurring/:id/trigger', async (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db  = getDB();
  const rec = db.prepare(`
    SELECT rp.*, p.price, p.stock, p.vendor_id, p.name AS product_name,
           da.address AS del_address, da.city AS del_city
    FROM recurring_purchases rp
    JOIN products p ON rp.product_id = p.id
    LEFT JOIN delivery_addresses da ON rp.delivery_address_id = da.id
    WHERE rp.id = ? AND rp.user_id = ?`).get(req.params.id, user.userId) as any;

  if (!rec) return res.status(404).json({ success: false, error: 'Not found' });
  if (!rec.is_active) return res.status(400).json({ success: false, error: 'Schedule is paused' });
  if (rec.stock < rec.quantity) return res.status(400).json({ success: false, error: `Insufficient stock (${rec.stock} available)` });

  const orderId         = uuidv4();
  const deliveryFee     = 500;
  const total           = rec.price * rec.quantity + deliveryFee;
  const estimatedDel    = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const trackingUpdates = JSON.stringify([{ status: 'pending', message: 'Recurring order placed', timestamp: new Date().toISOString() }]);

  db.prepare(`INSERT INTO orders
    (id, customer_id, vendor_id, status, total_amount, delivery_fee,
     delivery_address, delivery_city, payment_method, payment_status, estimated_delivery, tracking_updates)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, 'card', 'pending', ?, ?)`).run(
    orderId, user.userId, rec.vendor_id, total, deliveryFee,
    rec.del_address || 'To be confirmed', rec.del_city || 'Lagos',
    estimatedDel, trackingUpdates
  );

  db.prepare(`INSERT INTO order_items (id, order_id, product_id, quantity, price, product_name) VALUES (?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), orderId, rec.product_id, rec.quantity, rec.price, rec.product_name
  );

  /* Update stock, sales, advance schedule */
  db.prepare(`UPDATE products SET stock = stock - ?, total_sales = total_sales + ? WHERE id = ?`)
    .run(rec.quantity, rec.quantity, rec.product_id);

  const next = nextDate(rec.frequency);
  db.prepare(`UPDATE recurring_purchases SET last_ordered_at = datetime('now'), next_order_date = ? WHERE id = ?`)
    .run(next, req.params.id);

  /* Notify customer */
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), user.userId, 'recurring_order', '🔄 Recurring Order Placed!',
    `Your scheduled order for ${rec.product_name} has been placed. Next order: ${next.split('T')[0]}.`,
    JSON.stringify({ order_id: orderId, next_order_date: next })
  );

  return res.status(201).json({
    success: true,
    data: { order_id: orderId, next_order_date: next, total },
    message: 'Order placed from recurring schedule!'
  });
});

export default router;
