/**
 * ─── Delivery Address Routes ──────────────────────────────────────────────────
 * Manages customer delivery addresses and delivery mode options.
 *
 * Endpoints:
 *   GET    /api/delivery/addresses          – List saved addresses for current user
 *   POST   /api/delivery/addresses          – Add a new address
 *   PUT    /api/delivery/addresses/:id      – Update an address
 *   DELETE /api/delivery/addresses/:id      – Remove an address
 *   PUT    /api/delivery/addresses/:id/default – Set as default
 *   GET    /api/delivery/modes              – List available delivery modes + fees
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/**
 * Delivery modes available on the platform.
 * Fees are in NGN. ETA is a human-readable estimate.
 */
const DELIVERY_MODES = [
  {
    id:          'standard',
    label:       'Standard Delivery',
    description: 'Delivered within 48 hours',
    fee:         500,
    eta:         '24–48 hours',
    icon:        '🚚',
  },
  {
    id:          'express',
    label:       'Express Delivery',
    description: 'Same-day delivery (order before 12 PM)',
    fee:         1500,
    eta:         '2–6 hours',
    icon:        '⚡',
  },
  {
    id:          'overnight',
    label:       'Overnight Delivery',
    description: 'Next-morning by 9 AM',
    fee:         2000,
    eta:         'Next morning',
    icon:        '🌙',
  },
  {
    id:          'scheduled',
    label:       'Scheduled Delivery',
    description: 'Pick a date and time slot',
    fee:         800,
    eta:         'Your chosen slot',
    icon:        '📅',
  },
  {
    id:          'pickup',
    label:       'Store Pickup',
    description: 'Collect from the vendor directly',
    fee:         0,
    eta:         'Vendor-defined',
    icon:        '🏪',
  },
];

/* ── GET /api/delivery/modes ──────────────────────────────────────────────── */
/**
 * Returns all available delivery modes. No auth required.
 */
router.get('/modes', (_req: Request, res: Response) => {
  return res.json({ success: true, data: DELIVERY_MODES });
});

/* ── GET /api/delivery/addresses ─────────────────────────────────────────── */
/**
 * Returns all saved delivery addresses for the authenticated user,
 * sorted so the default address appears first.
 */
router.get('/addresses', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();
  const addresses = db.prepare(
    `SELECT * FROM delivery_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`
  ).all(user.userId);

  return res.json({ success: true, data: addresses });
});

/* ── POST /api/delivery/addresses ────────────────────────────────────────── */
/**
 * Creates a new delivery address.
 * If it's the first address or is_default=true, sets it as default and
 * clears the default flag on all other addresses.
 *
 * Body: { label, recipient_name, recipient_phone, address, city, state,
 *          country, latitude, longitude, is_default, delivery_instructions }
 */
router.post('/addresses', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const {
    label, recipient_name, recipient_phone, address, city, state,
    country, latitude, longitude, is_default, delivery_instructions
  } = req.body;

  if (!label || !recipient_name || !recipient_phone || !address || !city) {
    return res.status(400).json({ success: false, error: 'label, recipient_name, recipient_phone, address and city are required' });
  }

  const db  = getDB();
  const id  = uuidv4();

  /* If this should be default, demote all others first */
  const shouldBeDefault = !!is_default;
  if (shouldBeDefault) {
    db.prepare(`UPDATE delivery_addresses SET is_default = 0 WHERE user_id = ?`).run(user.userId);
  }

  /* If no addresses exist yet, automatically make this the default */
  const count = (db.prepare('SELECT COUNT(*) as n FROM delivery_addresses WHERE user_id = ?').get(user.userId) as any).n;

  db.prepare(`INSERT INTO delivery_addresses
    (id, user_id, label, recipient_name, recipient_phone, address, city, state, country,
     latitude, longitude, is_default, delivery_instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.userId, label, recipient_name, recipient_phone, address, city,
    state || null, country || 'Nigeria',
    latitude || null, longitude || null,
    (shouldBeDefault || count === 0) ? 1 : 0,
    delivery_instructions || null
  );

  const created = db.prepare('SELECT * FROM delivery_addresses WHERE id = ?').get(id);
  return res.status(201).json({ success: true, data: created, message: 'Address saved' });
});

/* ── PUT /api/delivery/addresses/:id ─────────────────────────────────────── */
/**
 * Updates an existing delivery address owned by the current user.
 */
router.put('/addresses/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db   = getDB();
  const addr = db.prepare('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?').get(req.params.id, user.userId) as any;
  if (!addr) return res.status(404).json({ success: false, error: 'Address not found' });

  const {
    label, recipient_name, recipient_phone, address, city, state,
    country, latitude, longitude, delivery_instructions
  } = req.body;

  db.prepare(`UPDATE delivery_addresses SET
    label = ?, recipient_name = ?, recipient_phone = ?, address = ?, city = ?,
    state = ?, country = ?, latitude = ?, longitude = ?, delivery_instructions = ?
    WHERE id = ?`).run(
    label || addr.label, recipient_name || addr.recipient_name,
    recipient_phone || addr.recipient_phone, address || addr.address, city || addr.city,
    state || addr.state, country || addr.country, latitude || addr.latitude, longitude || addr.longitude,
    delivery_instructions || addr.delivery_instructions, req.params.id
  );

  const updated = db.prepare('SELECT * FROM delivery_addresses WHERE id = ?').get(req.params.id);
  return res.json({ success: true, data: updated, message: 'Address updated' });
});

/* ── PUT /api/delivery/addresses/:id/default ─────────────────────────────── */
/**
 * Sets the specified address as the user's default delivery address.
 */
router.put('/addresses/:id/default', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db   = getDB();
  const addr = db.prepare('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?').get(req.params.id, user.userId);
  if (!addr) return res.status(404).json({ success: false, error: 'Address not found' });

  /* Demote all, then promote this one */
  db.prepare(`UPDATE delivery_addresses SET is_default = 0 WHERE user_id = ?`).run(user.userId);
  db.prepare(`UPDATE delivery_addresses SET is_default = 1 WHERE id = ?`).run(req.params.id);

  return res.json({ success: true, message: 'Default address updated' });
});

/* ── DELETE /api/delivery/addresses/:id ──────────────────────────────────── */
/**
 * Deletes a delivery address owned by the current user.
 */
router.delete('/addresses/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();
  const addr = db.prepare('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?').get(req.params.id, user.userId) as any;
  if (!addr) return res.status(404).json({ success: false, error: 'Address not found' });

  db.prepare('DELETE FROM delivery_addresses WHERE id = ?').run(req.params.id);

  /* If the deleted address was default, promote the most recent remaining one */
  if (addr.is_default) {
    const next = db.prepare('SELECT id FROM delivery_addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.userId) as any;
    if (next) db.prepare(`UPDATE delivery_addresses SET is_default = 1 WHERE id = ?`).run(next.id);
  }

  return res.json({ success: true, message: 'Address deleted' });
});

export default router;
