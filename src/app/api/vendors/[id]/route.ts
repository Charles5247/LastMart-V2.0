import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = getDB();
    const vendor = db.prepare(`
      SELECT v.*, u.name as user_name, u.email as user_email 
      FROM vendors v JOIN users u ON v.user_id = u.id 
      WHERE v.id = ?`).get(id) as any;
    if (!vendor) return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });

    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.vendor_id = ? AND p.is_active = 1 
      ORDER BY p.is_featured DESC, p.created_at DESC`).all(id) as any[];

    const reviews = db.prepare(`
      SELECT r.*, u.name as customer_name, u.avatar as customer_avatar 
      FROM reviews r JOIN users u ON r.customer_id = u.id 
      WHERE r.vendor_id = ? ORDER BY r.created_at DESC LIMIT 10`).all(id);

    const parsedProducts = products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      tags: JSON.parse(p.tags || '[]')
    }));

    return NextResponse.json({ success: true, data: { vendor, products: parsedProducts, reviews } });
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
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as any;
    if (!vendor) return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });

    if (vendor.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { store_name, description, category, city, address, phone, email, status } = body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (store_name) { updateFields.push('store_name = ?'); updateValues.push(store_name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (category) { updateFields.push('category = ?'); updateValues.push(category); }
    if (city) { updateFields.push('city = ?'); updateValues.push(city); }
    if (address !== undefined) { updateFields.push('address = ?'); updateValues.push(address); }
    if (phone !== undefined) { updateFields.push('phone = ?'); updateValues.push(phone); }
    if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
    if (status && userPayload.role === 'admin') { updateFields.push('status = ?'); updateValues.push(status); }

    if (updateFields.length === 0) return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });

    updateFields.push("updated_at = datetime('now')");
    updateValues.push(id);

    db.prepare(`UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
    const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
    return NextResponse.json({ success: true, data: updated, message: 'Vendor updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
