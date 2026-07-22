/**
 * ─── Coupon & Referral Routes ─────────────────────────────────────────────────
 *
 * Endpoints:
 *   GET  /api/coupons/validate/:code     – Validate a coupon code (guest/user)
 *   GET  /api/coupons/my                 – List coupons available to current user
 *   POST /api/coupons                    – Admin: create a coupon
 *   PUT  /api/coupons/:id               – Admin: update a coupon
 *   DELETE /api/coupons/:id             – Admin: delete a coupon
 *   GET  /api/coupons                   – Admin: list all coupons
 *   POST /api/coupons/referral/generate – Generate referral link for a user
 *   GET  /api/coupons/referral/stats    – Referral stats for current user
 *   POST /api/coupons/referral/register – Called on new user signup with ref code
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function genCode(prefix = 'LM'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createNotification(db: any, userId: string, type: string, title: string, message: string, data: object = {}) {
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), userId, type, title, message, JSON.stringify(data));
}

/* ── GET /api/coupons/validate/:code ──────────────────────────────────────── */
router.get('/validate/:code', (req: Request, res: Response) => {
  const db     = getDB();
  const { code } = req.params;
  const orderAmount = parseFloat(req.query.amount as string || '0');

  const coupon = db.prepare(`SELECT * FROM coupons WHERE code = ? AND is_active = 1`).get(code) as any;
  if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found or inactive' });

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ success: false, error: 'Coupon has expired' });
  }
  if (coupon.max_uses > 0 && coupon.uses_count >= coupon.max_uses) {
    return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
  }
  if (orderAmount > 0 && orderAmount < coupon.min_order) {
    return res.status(400).json({ success: false, error: `Minimum order of ₦${coupon.min_order.toLocaleString()} required` });
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === 'percent' || coupon.type === 'referral') {
    discount = orderAmount > 0 ? parseFloat((orderAmount * coupon.value / 100).toFixed(2)) : 0;
  } else {
    discount = coupon.value;
  }

  return res.json({
    success: true,
    data: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discount_amount: discount,
    },
  });
});

/* ── GET /api/coupons/my ──────────────────────────────────────────────────── */
router.get('/my', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();

  // Get referral coupons specifically for this user, plus active general coupons
  const coupons = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM coupon_uses cu WHERE cu.coupon_id = c.id AND cu.user_id = ?) as my_uses
    FROM coupons c
    WHERE c.is_active = 1
      AND (c.expires_at IS NULL OR c.expires_at > datetime('now'))
      AND (c.max_uses = 0 OR c.uses_count < c.max_uses)
    ORDER BY c.created_at DESC
    LIMIT 20
  `).all(user.userId) as any[];

  return res.json({ success: true, data: coupons });
});

/* ── GET /api/coupons (admin) ─────────────────────────────────────────────── */
router.get('/', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const db = getDB();
  const coupons = db.prepare(`
    SELECT c.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM coupon_uses cu WHERE cu.coupon_id = c.id) as total_uses_detail
    FROM coupons c
    LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.created_at DESC
  `).all() as any[];

  return res.json({ success: true, data: coupons });
});

/* ── POST /api/coupons (admin) ────────────────────────────────────────────── */
router.post('/', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const db = getDB();
  const {
    code,
    type = 'fixed',
    value,
    min_order = 0,
    max_uses = 0,
    expires_at,
    description,
    target_min_spend, // if set, auto-send to qualifying users
  } = req.body;

  if (!value || value <= 0) return res.status(400).json({ success: false, error: 'Value required' });

  const finalCode = code || genCode('LM');

  // Check code uniqueness
  const existing = db.prepare(`SELECT id FROM coupons WHERE code = ?`).get(finalCode);
  if (existing) return res.status(400).json({ success: false, error: 'Coupon code already exists' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO coupons (id, code, type, value, min_order, max_uses, expires_at, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, finalCode, type, value, min_order, max_uses, expires_at || null, description || null, user.userId);

  // If target_min_spend provided → notify all qualifying customers
  if (target_min_spend && target_min_spend > 0) {
    const qualifyingUsers = db.prepare(`
      SELECT DISTINCT u.id, u.name
      FROM users u
      JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
        AND o.payment_status = 'completed'
      GROUP BY u.id
      HAVING SUM(o.total_amount) >= ?
    `).all(target_min_spend) as any[];

    for (const u of qualifyingUsers) {
      createNotification(db, u.id, 'coupon', '🎁 Special Coupon for You!',
        `Use code "${finalCode}" to get ${type === 'percent' ? `${value}% off` : `₦${value.toLocaleString()} off`} your next order. ${description || ''}`,
        { coupon_id: id, code: finalCode }
      );
    }
  }

  const coupon = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(id);
  return res.json({ success: true, data: coupon, message: 'Coupon created successfully' });
});

/* ── PUT /api/coupons/:id (admin) ────────────────────────────────────────── */
router.put('/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const db = getDB();
  const { is_active, value, max_uses, expires_at, description } = req.body;

  db.prepare(`
    UPDATE coupons SET
      is_active   = COALESCE(?, is_active),
      value       = COALESCE(?, value),
      max_uses    = COALESCE(?, max_uses),
      expires_at  = COALESCE(?, expires_at),
      description = COALESCE(?, description)
    WHERE id = ?
  `).run(
    is_active ?? null, value ?? null, max_uses ?? null,
    expires_at ?? null, description ?? null, req.params.id
  );

  return res.json({ success: true });
});

/* ── DELETE /api/coupons/:id (admin) ─────────────────────────────────────── */
router.delete('/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const db = getDB();
  db.prepare(`UPDATE coupons SET is_active = 0 WHERE id = ?`).run(req.params.id);
  return res.json({ success: true });
});

/* ── POST /api/coupons/referral/generate ─────────────────────────────────── */
/**
 * Generates a personal referral link / code for a user.
 * The link encodes the user's ID so we know who referred the new customer.
 */
router.post('/referral/generate', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();

  // Check if user already has a referral code stored
  const me = db.prepare(`SELECT referral_code FROM users WHERE id = ?`).get(user.userId) as any;
  let refCode = me?.referral_code;

  if (!refCode) {
    refCode = genCode('REF');
    db.prepare(`UPDATE users SET referral_code = ? WHERE id = ?`).run(refCode, user.userId);
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return res.json({
    success: true,
    data: {
      referral_code: refCode,
      referral_url: `${frontendUrl}/auth/register?ref=${refCode}`,
      share_message: `Join LastMart using my referral link and get a discount on your first purchase! 🛍️`,
    },
  });
});

/* ── GET /api/coupons/referral/stats ─────────────────────────────────────── */
router.get('/referral/stats', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();
  const me = db.prepare(`SELECT referral_code FROM users WHERE id = ?`).get(user.userId) as any;

  const referrals = db.prepare(`
    SELECT r.*, u.name as referred_name, u.email as referred_email,
           c.code as coupon_code, c.value as coupon_value
    FROM referrals r
    LEFT JOIN users u ON r.referred_id = u.id
    LEFT JOIN coupons c ON r.coupon_id = c.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(user.userId) as any[];

  const totalReward = referrals.filter(r => r.status === 'completed').reduce((s, r) => s + (r.reward_amount || 0), 0);

  return res.json({
    success: true,
    data: {
      referral_code: me?.referral_code || null,
      referral_url: me?.referral_code ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/register?ref=${me.referral_code}` : null,
      total_referrals: referrals.length,
      completed: referrals.filter(r => r.status === 'completed').length,
      pending: referrals.filter(r => r.status === 'pending').length,
      total_reward: totalReward,
      referrals,
    },
  });
});

/* ── POST /api/coupons/referral/register ─────────────────────────────────── */
/**
 * Called automatically when a new user signs up via a referral link.
 * Creates a 0.5% coupon for the new user and rewards the referrer.
 * Body: { referral_code, new_user_id }
 */
router.post('/referral/register', (req: Request, res: Response) => {
  const db = getDB();
  const { referral_code, new_user_id } = req.body;
  if (!referral_code || !new_user_id) {
    return res.status(400).json({ success: false, error: 'referral_code and new_user_id required' });
  }

  // Find referrer
  const referrer = db.prepare(`SELECT id, name FROM users WHERE referral_code = ?`).get(referral_code) as any;
  if (!referrer) return res.status(404).json({ success: false, error: 'Invalid referral code' });
  if (referrer.id === new_user_id) return res.status(400).json({ success: false, error: 'Cannot refer yourself' });

  // Ensure the new user hasn't already been referred
  const existing = db.prepare(`SELECT id FROM referrals WHERE referred_id = ?`).get(new_user_id);
  if (existing) return res.json({ success: true, message: 'Already processed' });

  // Create a 0.5% referral coupon for the new user
  const couponCode = genCode('REF');
  const couponId   = uuidv4();
  const refId      = uuidv4();

  db.prepare(`
    INSERT INTO coupons (id, code, type, value, description, created_by, max_uses)
    VALUES (?, ?, 'referral', 0.5, ?, ?, 1)
  `).run(couponId, couponCode, `Referral welcome discount from ${referrer.name}`, referrer.id);

  // Record referred_by on the new user
  db.prepare(`UPDATE users SET referred_by = ? WHERE id = ?`).run(referrer.id, new_user_id);

  // Create referral record
  db.prepare(`
    INSERT INTO referrals (id, referrer_id, referred_id, coupon_id, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(refId, referrer.id, new_user_id, couponId);

  // Notify new user
  const newUser = db.prepare(`SELECT name FROM users WHERE id = ?`).get(new_user_id) as any;
  createNotification(db, new_user_id, 'coupon',
    '🎉 Welcome Referral Discount!',
    `You joined via ${referrer.name}'s referral. Use code "${couponCode}" for 0.5% off your next purchase!`,
    { coupon_code: couponCode, coupon_id: couponId }
  );

  // Notify referrer
  createNotification(db, referrer.id, 'referral',
    '👥 New Referral!',
    `${newUser?.name || 'A new user'} joined LastMart via your referral link!`,
    { referred_user: new_user_id }
  );

  return res.json({ success: true, data: { coupon_code: couponCode, message: 'Referral processed' } });
});

/* ── POST /api/coupons/vendor-referral ───────────────────────────────────── */
/**
 * Called when a user visits a vendor store via a shared vendor URL.
 * Generates a 0.5% coupon on their first purchase from that vendor.
 */
router.post('/vendor-referral', (req: Request, res: Response) => {
  const db = getDB();
  const { vendor_id, user_id, share_token } = req.body;
  if (!vendor_id || !user_id) {
    return res.status(400).json({ success: false, error: 'vendor_id and user_id required' });
  }

  // Verify share token
  const vendor = db.prepare(`SELECT id, store_name, user_id FROM vendors WHERE id = ? AND share_token = ?`).get(vendor_id, share_token) as any;
  if (!vendor) return res.status(404).json({ success: false, error: 'Invalid vendor share link' });

  // Don't give the vendor's own coupon
  if (vendor.user_id === user_id) return res.json({ success: true, skipped: true });

  // Check if already got a vendor referral coupon from this vendor
  const alreadyGot = db.prepare(`
    SELECT cu.id FROM coupon_uses cu JOIN coupons c ON cu.coupon_id = c.id
    WHERE cu.user_id = ? AND c.description LIKE ?
  `).get(user_id, `%${vendor_id}%`);
  if (alreadyGot) return res.json({ success: true, skipped: true, message: 'Already received coupon' });

  const couponCode = genCode('VRF');
  const couponId   = uuidv4();

  db.prepare(`
    INSERT INTO coupons (id, code, type, value, description, max_uses, created_by)
    VALUES (?, ?, 'referral', 0.5, ?, 1, ?)
  `).run(couponId, couponCode, `Vendor referral – ${vendor.store_name} (${vendor_id})`, vendor.user_id);

  createNotification(db, user_id, 'coupon',
    `🏪 ${vendor.store_name} Welcome Discount!`,
    `You discovered ${vendor.store_name} via a share link! Use code "${couponCode}" for 0.5% off your next purchase.`,
    { coupon_code: couponCode, vendor_id }
  );

  return res.json({ success: true, data: { coupon_code: couponCode } });
});

export default router;
