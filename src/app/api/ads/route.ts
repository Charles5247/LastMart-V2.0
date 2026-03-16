import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const type = searchParams.get('type');

    let query = `SELECT a.*, v.store_name as vendor_name, p.name as product_name 
      FROM advertisements a 
      JOIN vendors v ON a.vendor_id = v.id 
      LEFT JOIN products p ON a.product_id = p.id 
      WHERE a.status = 'active' AND a.end_date >= datetime('now')`;
    const params: any[] = [];

    if (city) { query += ` AND (a.target_city IS NULL OR LOWER(a.target_city) LIKE LOWER(?))`; params.push(`%${city}%`); }
    if (type) { query += ` AND a.type = ?`; params.push(type); }
    query += ` ORDER BY a.budget DESC LIMIT 10`;

    const ads = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: ads });
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

    const body = await request.json();
    const { product_id, type, title, description, image, budget, start_date, end_date, target_city } = body;

    if (!type || !title || !budget || !start_date || !end_date) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    if (vendor.ad_balance < budget) {
      return NextResponse.json({ success: false, error: 'Insufficient ad balance' }, { status: 400 });
    }

    const adId = uuidv4();
    db.prepare(`INSERT INTO advertisements (id, vendor_id, product_id, type, title, description, image, budget, start_date, end_date, target_city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      adId, vendor.id, product_id || null, type, title, description || null, image || null, budget, start_date, end_date, target_city || null
    );

    // Mark product as sponsored
    if (product_id && type === 'sponsored_product') {
      db.prepare('UPDATE products SET is_sponsored = 1 WHERE id = ?').run(product_id);
    }

    return NextResponse.json({ success: true, message: 'Advertisement created', data: { id: adId } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET_vendor(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload || userPayload.role !== 'vendor') {
      return NextResponse.json({ success: false, error: 'Vendor access required' }, { status: 403 });
    }

    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
    if (!vendor) return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });

    const ads = db.prepare(`SELECT a.*, p.name as product_name FROM advertisements a LEFT JOIN products p ON a.product_id = p.id WHERE a.vendor_id = ? ORDER BY a.created_at DESC`).all(vendor.id);

    return NextResponse.json({ success: true, data: ads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
