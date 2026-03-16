import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculateDistance } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    let query = `SELECT v.*, u.name as user_name, u.email as user_email FROM vendors v JOIN users u ON v.user_id = u.id WHERE v.status = 'approved'`;
    const params: any[] = [];

    if (city) { query += ` AND LOWER(v.city) LIKE LOWER(?)`; params.push(`%${city}%`); }
    if (category) { query += ` AND v.category = ?`; params.push(category); }
    if (search) { query += ` AND (v.store_name LIKE ? OR v.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }

    query += ` ORDER BY v.is_featured DESC, v.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    let vendors = db.prepare(query).all(...params) as any[];

    if (lat && lng) {
      vendors = vendors.map(v => ({
        ...v,
        distance: v.latitude && v.longitude ? calculateDistance(lat, lng, v.latitude, v.longitude) : null
      })).sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    const countQuery = `SELECT COUNT(*) as total FROM vendors v WHERE v.status = 'approved'${city ? ` AND LOWER(v.city) LIKE LOWER('%${city}%')` : ''}`;
    const { total } = db.prepare(countQuery).get() as any;

    return NextResponse.json({
      success: true,
      data: vendors,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return NextResponse.json({ success: false, error: 'Vendor profile not found' }, { status: 404 });

    const body = await request.json();
    const { store_name, description, category, city, address, phone, email } = body;

    db.prepare(`UPDATE vendors SET store_name = ?, description = ?, category = ?, city = ?, address = ?, phone = ?, email = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
      store_name, description, category, city, address, phone, email, userPayload.userId
    );

    const updated = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId);
    return NextResponse.json({ success: true, data: updated, message: 'Store updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
