import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const featured = searchParams.get('featured');
    const sponsored = searchParams.get('sponsored');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    let query = `SELECT p.*, v.store_name as vendor_name, v.city as vendor_city, v.status as vendor_status, c.name as category_name 
      FROM products p 
      JOIN vendors v ON p.vendor_id = v.id 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = 1 AND v.status = 'approved'`;
    
    const params: any[] = [];

    if (vendorId) { query += ` AND p.vendor_id = ?`; params.push(vendorId); }
    if (categoryId) { query += ` AND p.category_id = ?`; params.push(categoryId); }
    if (search) { query += ` AND (p.name LIKE ? OR p.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (city) { query += ` AND LOWER(v.city) LIKE LOWER(?)`; params.push(`%${city}%`); }
    if (featured === 'true') { query += ` AND p.is_featured = 1`; }
    if (sponsored === 'true') { query += ` AND p.is_sponsored = 1`; }
    if (minPrice) { query += ` AND p.price >= ?`; params.push(parseFloat(minPrice)); }
    if (maxPrice) { query += ` AND p.price <= ?`; params.push(parseFloat(maxPrice)); }

    const countQuery = query.replace('SELECT p.*, v.store_name as vendor_name, v.city as vendor_city, v.status as vendor_status, c.name as category_name', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params) as any;

    query += ` ORDER BY p.is_sponsored DESC, p.is_featured DESC, p.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const products = db.prepare(query).all(...params) as any[];
    const parsed = products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      tags: JSON.parse(p.tags || '[]')
    }));

    return NextResponse.json({
      success: true, data: parsed,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload || userPayload.role !== 'vendor') {
      return NextResponse.json({ success: false, error: 'Vendor access required' }, { status: 403 });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    if (vendor.status !== 'approved') return NextResponse.json({ success: false, error: 'Vendor not approved' }, { status: 403 });

    const body = await request.json();
    const { name, description, price, original_price, category_id, images, stock, unit, tags } = body;

    if (!name || !price || price <= 0) {
      return NextResponse.json({ success: false, error: 'Name and valid price are required' }, { status: 400 });
    }

    const productId = uuidv4();
    db.prepare(`INSERT INTO products (id, vendor_id, category_id, name, description, price, original_price, images, stock, unit, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      productId, vendor.id, category_id || null, name, description || null,
      price, original_price || null, JSON.stringify(images || []),
      stock || 0, unit || 'piece', JSON.stringify(tags || [])
    );

    // Low stock notification
    if ((stock || 0) < 5) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
        uuidv4(), userPayload.userId, 'low_stock', 'Low Stock Alert',
        `Product "${name}" has low stock (${stock || 0} units). Please restock soon.`
      );
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    return NextResponse.json({ success: true, data: { ...product, images: JSON.parse(product.images), tags: JSON.parse(product.tags) }, message: 'Product created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
