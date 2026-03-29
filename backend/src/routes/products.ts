import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/products
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { vendor_id, category_id, search, city, featured, sponsored, min_price, max_price } = req.query as Record<string, string>;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '12');
    const offset = (page - 1) * limit;

    let query = `SELECT p.*, v.store_name as vendor_name, v.city as vendor_city, v.status as vendor_status, c.name as category_name 
      FROM products p 
      JOIN vendors v ON p.vendor_id = v.id 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = 1 AND v.status = 'approved'`;
    const params: any[] = [];

    if (vendor_id) { query += ` AND p.vendor_id = ?`; params.push(vendor_id); }
    if (category_id) { query += ` AND p.category_id = ?`; params.push(category_id); }
    if (search) { query += ` AND (p.name LIKE ? OR p.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (city) { query += ` AND LOWER(v.city) LIKE LOWER(?)`; params.push(`%${city}%`); }
    if (featured === 'true') { query += ` AND p.is_featured = 1`; }
    if (sponsored === 'true') { query += ` AND p.is_sponsored = 1`; }
    if (min_price) { query += ` AND p.price >= ?`; params.push(parseFloat(min_price)); }
    if (max_price) { query += ` AND p.price <= ?`; params.push(parseFloat(max_price)); }

    const countQuery = query.replace(
      'SELECT p.*, v.store_name as vendor_name, v.city as vendor_city, v.status as vendor_status, c.name as category_name',
      'SELECT COUNT(*) as total'
    );
    const { total } = db.prepare(countQuery).get(...params) as any;

    query += ` ORDER BY p.is_sponsored DESC, p.is_featured DESC, p.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const products = db.prepare(query).all(...params) as any[];
    const parsed = products.map(p => ({ ...p, images: JSON.parse(p.images || '[]'), tags: JSON.parse(p.tags || '[]') }));

    return res.json({ success: true, data: parsed, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const product = db.prepare(`
      SELECT p.*, v.store_name as vendor_name, v.city as vendor_city, v.rating as vendor_rating, 
             v.status as vendor_status, v.description as vendor_description, c.name as category_name
      FROM products p 
      JOIN vendors v ON p.vendor_id = v.id 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?`).get(id) as any;

    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const reviews = db.prepare(`
      SELECT r.*, u.name as customer_name, u.avatar as customer_avatar 
      FROM reviews r JOIN users u ON r.customer_id = u.id 
      WHERE r.product_id = ? ORDER BY r.created_at DESC`).all(id);

    const related = db.prepare(`
      SELECT p.*, v.store_name as vendor_name 
      FROM products p JOIN vendors v ON p.vendor_id = v.id 
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1 LIMIT 4`).all(product.category_id, id) as any[];

    if (product.is_sponsored) {
      db.prepare(`UPDATE advertisements SET impressions = impressions + 1 WHERE product_id = ? AND status = 'active'`).run(id);
    }

    return res.json({
      success: true,
      data: {
        ...product,
        images: JSON.parse(product.images || '[]'),
        tags: JSON.parse(product.tags || '[]'),
        reviews,
        related: related.map(r => ({ ...r, images: JSON.parse(r.images || '[]') }))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/products
router.post('/', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Vendor access required' });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
    if (vendor.status !== 'approved') return res.status(403).json({ success: false, error: 'Vendor not approved' });

    const { name, description, price, original_price, category_id, images, stock, unit, tags } = req.body;
    if (!name || !price || price <= 0) {
      return res.status(400).json({ success: false, error: 'Name and valid price are required' });
    }

    const productId = uuidv4();
    db.prepare(`INSERT INTO products (id, vendor_id, category_id, name, description, price, original_price, images, stock, unit, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      productId, vendor.id, category_id || null, name, description || null,
      price, original_price || null, JSON.stringify(images || []),
      stock || 0, unit || 'piece', JSON.stringify(tags || [])
    );

    if ((stock || 0) < 5) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
        uuidv4(), userPayload.userId, 'low_stock', 'Low Stock Alert',
        `Product "${name}" has low stock (${stock || 0} units). Please restock soon.`
      );
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    return res.status(201).json({
      success: true,
      data: { ...product, images: JSON.parse(product.images), tags: JSON.parse(product.tags) },
      message: 'Product created'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const product = db.prepare('SELECT p.*, v.user_id FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ?').get(id) as any;
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    if (product.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { name, description, price, original_price, category_id, images, stock, unit, tags, is_active, is_featured } = req.body;

    db.prepare(`UPDATE products SET name = ?, description = ?, price = ?, original_price = ?, category_id = ?, images = ?, stock = ?, unit = ?, tags = ?, is_active = ?, is_featured = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name, description || null, price, original_price || null, category_id || null,
      JSON.stringify(images || []), stock || 0, unit || 'piece', JSON.stringify(tags || []),
      is_active !== undefined ? is_active : 1, is_featured !== undefined ? is_featured : 0, id
    );

    if (stock < 5) {
      const vendor = db.prepare('SELECT v.*, u.id as user_id FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.id = ?').get(product.vendor_id) as any;
      if (vendor) {
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
          uuidv4(), vendor.user_id, 'low_stock', 'Low Stock Alert!', `"${name}" is running low (${stock} left). Please restock!`
        );
      }
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    return res.json({ success: true, data: { ...updated, images: JSON.parse(updated.images), tags: JSON.parse(updated.tags) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const product = db.prepare('SELECT p.*, v.user_id FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ?').get(id) as any;
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    if (product.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
