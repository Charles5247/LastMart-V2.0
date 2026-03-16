import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = getDB();
    const product = db.prepare(`
      SELECT p.*, v.store_name as vendor_name, v.city as vendor_city, v.rating as vendor_rating, 
             v.status as vendor_status, v.description as vendor_description, c.name as category_name
      FROM products p 
      JOIN vendors v ON p.vendor_id = v.id 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?`).get(id) as any;

    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

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

    return NextResponse.json({
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const product = db.prepare('SELECT p.*, v.user_id FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ?').get(id) as any;
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    if (product.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, original_price, category_id, images, stock, unit, tags, is_active, is_featured } = body;

    db.prepare(`UPDATE products SET name = ?, description = ?, price = ?, original_price = ?, category_id = ?, images = ?, stock = ?, unit = ?, tags = ?, is_active = ?, is_featured = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name, description || null, price, original_price || null, category_id || null,
      JSON.stringify(images || []), stock || 0, unit || 'piece', JSON.stringify(tags || []),
      is_active !== undefined ? is_active : 1, is_featured !== undefined ? is_featured : 0, id
    );

    if (stock < 5) {
      const vendor = db.prepare('SELECT v.*, u.id as user_id FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.id = ?').get(product.vendor_id) as any;
      if (vendor) {
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
          uuidv4(), vendor.user_id, 'low_stock', 'Low Stock Alert!',
          `"${name}" is running low (${stock} left). Please restock!`
        );
      }
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    return NextResponse.json({ success: true, data: { ...updated, images: JSON.parse(updated.images), tags: JSON.parse(updated.tags) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const product = db.prepare('SELECT p.*, v.user_id FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ?').get(id) as any;
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    if (product.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
