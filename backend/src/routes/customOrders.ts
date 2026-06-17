/**
 * ─── Custom Orders & Product Requests ────────────────────────────────────────
 * Allows buyers to:
 *   1. Make a SPECIFIC ORDER for a listed product (custom quantity, specs, notes)
 *   2. REQUEST a CUSTOM PRODUCT by uploading a photo + description
 *
 * GET  /api/custom-orders              – Buyer: list my custom orders
 * POST /api/custom-orders              – Buyer: create specific order or product request
 * GET  /api/custom-orders/:id          – Get single custom order detail
 * PUT  /api/custom-orders/:id/cancel   – Buyer: cancel pending order
 * GET  /api/custom-orders/vendor       – Vendor: list received custom orders
 * PUT  /api/custom-orders/:id/respond  – Vendor: accept/quote/reject
 * POST /api/custom-orders/:id/photos   – Upload reference photo (multipart)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

/* ── Multer config for reference photos ─────────────────────────────────── */
const UPLOAD_DIR = path.join(__dirname, '../../../../public/uploads/custom-orders');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
  },
});

/* ── GET /api/custom-orders (buyer's orders) ──────────────────────────── */
router.get('/', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const { type, status } = req.query;
    let sql = `
      SELECT co.*, v.store_name, v.logo_url,
             p.name as product_name, p.images as product_images,
             p.price as product_price
      FROM custom_orders co
      JOIN vendors v ON co.vendor_id = v.id
      LEFT JOIN products p ON co.product_id = p.id
      WHERE co.buyer_id = ?
    `;
    const params: any[] = [user.userId];
    if (type) { sql += ' AND co.type = ?'; params.push(type); }
    if (status) { sql += ' AND co.status = ?'; params.push(status); }
    sql += ' ORDER BY co.created_at DESC';
    const orders = db.prepare(sql).all(...params);
    return res.json({ success: true, data: orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/custom-orders (create) ─────────────────────────────────── */
router.post('/', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (user.role !== 'customer') return res.status(403).json({ success: false, error: 'Customers only' });

  try {
    const db = getDB();
    const {
      vendor_id, product_id, type, title, description, quantity,
      budget_min, budget_max, size_specs, color_preference,
      delivery_deadline, buyer_note,
    } = req.body;

    if (!vendor_id || !type || !title || !description) {
      return res.status(400).json({ success: false, error: 'vendor_id, type, title, and description are required' });
    }
    if (!['specific', 'custom_request'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be specific or custom_request' });
    }

    // Validate vendor exists
    const vendor = db.prepare('SELECT id FROM vendors WHERE id = ?').get(vendor_id) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    // For specific orders, ensure product exists
    if (type === 'specific' && product_id) {
      const prod = db.prepare('SELECT id FROM products WHERE id = ? AND vendor_id = ? AND is_active = 1').get(product_id, vendor_id) as any;
      if (!prod) return res.status(404).json({ success: false, error: 'Product not found in this vendor catalog' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO custom_orders (
        id, buyer_id, vendor_id, product_id, type, title, description,
        quantity, budget_min, budget_max, size_specs, color_preference,
        delivery_deadline, buyer_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, user.userId, vendor_id, product_id || null, type, title, description,
      quantity || 1, budget_min || null, budget_max || null,
      size_specs || null, color_preference || null,
      delivery_deadline || null, buyer_note || null
    );

    // Notify vendor
    const buyer = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as any;
    const vendorUser = db.prepare('SELECT user_id FROM vendors WHERE id = ?').get(vendor_id) as any;
    if (vendorUser) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'custom_order', ?, ?, ?)`)
        .run(
          uuidv4(), vendorUser.user_id,
          type === 'specific' ? 'New Specific Order' : 'New Product Request',
          `${buyer?.name || 'A buyer'} sent you a ${type === 'specific' ? 'specific order request' : 'custom product request'}: "${title}"`,
          JSON.stringify({ custom_order_id: id })
        );
    }

    const created = db.prepare('SELECT * FROM custom_orders WHERE id = ?').get(id);
    return res.status(201).json({ success: true, data: created, message: 'Request sent to vendor' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── GET /api/custom-orders/vendor (vendor's received orders) ─────────── */
router.get('/vendor', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor profile not found' });

    const { type, status } = req.query;
    let sql = `
      SELECT co.*, u.name as buyer_name, u.phone as buyer_phone,
             p.name as product_name, p.images as product_images, p.price as product_price
      FROM custom_orders co
      JOIN users u ON co.buyer_id = u.id
      LEFT JOIN products p ON co.product_id = p.id
      WHERE co.vendor_id = ?
    `;
    const params: any[] = [vendor.id];
    if (type) { sql += ' AND co.type = ?'; params.push(type); }
    if (status) { sql += ' AND co.status = ?'; params.push(status); }
    sql += ' ORDER BY co.created_at DESC';
    const orders = db.prepare(sql).all(...params);
    return res.json({ success: true, data: orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── GET /api/custom-orders/:id ────────────────────────────────────────── */
router.get('/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const order = db.prepare(`
      SELECT co.*, v.store_name, v.logo_url, u.name as buyer_name,
             p.name as product_name, p.images as product_images, p.price as product_price
      FROM custom_orders co
      JOIN vendors v ON co.vendor_id = v.id
      JOIN users u ON co.buyer_id = u.id
      LEFT JOIN products p ON co.product_id = p.id
      WHERE co.id = ?
    `).get(req.params.id) as any;

    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // Only buyer or vendor can view
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (order.buyer_id !== user.userId && vendor?.id !== order.vendor_id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, data: order });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── PUT /api/custom-orders/:id/respond (vendor responds) ─────────────── */
router.put('/:id/respond', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(403).json({ success: false, error: 'Vendor access only' });

    const order = db.prepare('SELECT * FROM custom_orders WHERE id = ? AND vendor_id = ?').get(req.params.id, vendor.id) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const { status, vendor_note, vendor_quote } = req.body;
    const validStatuses = ['accepted', 'quoted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be accepted, quoted, or rejected' });
    }

    db.prepare(`UPDATE custom_orders SET status=?, vendor_note=?, vendor_quote=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(status, vendor_note || null, vendor_quote || null, req.params.id);

    // Notify buyer
    const buyer = db.prepare('SELECT name FROM users WHERE id = ?').get(order.buyer_id) as any;
    const vendorInfo = db.prepare('SELECT store_name FROM vendors WHERE id = ?').get(vendor.id) as any;
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'custom_order_update', ?, ?, ?)`)
      .run(
        uuidv4(), order.buyer_id,
        `Your ${order.type === 'specific' ? 'order request' : 'product request'} was ${status}`,
        `${vendorInfo?.store_name || 'The vendor'} has ${status} your request: "${order.title}"${vendor_quote ? ` — Quote: ₦${Number(vendor_quote).toLocaleString()}` : ''}`,
        JSON.stringify({ custom_order_id: req.params.id })
      );

    return res.json({ success: true, message: `Request ${status} successfully` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── PUT /api/custom-orders/:id/cancel (buyer cancels) ────────────────── */
router.put('/:id/cancel', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const order = db.prepare('SELECT * FROM custom_orders WHERE id = ? AND buyer_id = ?').get(req.params.id, user.userId) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (!['pending', 'quoted'].includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Can only cancel pending or quoted orders' });
    }

    db.prepare(`UPDATE custom_orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
    return res.json({ success: true, message: 'Order cancelled' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ── POST /api/custom-orders/:id/photos ───────────────────────────────── */
router.post('/:id/photos', upload.single('reference_photo'), (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const db = getDB();
    const order = db.prepare('SELECT * FROM custom_orders WHERE id = ? AND buyer_id = ?').get(req.params.id, user.userId) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (!req.file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

    const photoUrl = `/uploads/custom-orders/${req.file.filename}`;
    db.prepare('UPDATE custom_orders SET reference_photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(photoUrl, req.params.id);

    return res.json({ success: true, data: { photo_url: photoUrl }, message: 'Photo uploaded' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
