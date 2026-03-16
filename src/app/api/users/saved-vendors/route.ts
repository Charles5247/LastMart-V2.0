import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const saved = db.prepare(`SELECT sv.*, v.store_name, v.description, v.logo, v.category, v.city, v.rating, v.total_reviews, v.status FROM saved_vendors sv JOIN vendors v ON sv.vendor_id = v.id WHERE sv.user_id = ? ORDER BY sv.created_at DESC`).all(userPayload.userId);

    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const { vendor_id } = await request.json();

    const existing = db.prepare('SELECT id FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').get(userPayload.userId, vendor_id);
    if (existing) return NextResponse.json({ success: false, error: 'Already saved' }, { status: 400 });

    db.prepare('INSERT INTO saved_vendors (id, user_id, vendor_id) VALUES (?, ?, ?)').run(uuidv4(), userPayload.userId, vendor_id);
    return NextResponse.json({ success: true, message: 'Vendor saved' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');

    db.prepare('DELETE FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').run(userPayload.userId, vendorId);
    return NextResponse.json({ success: true, message: 'Vendor unsaved' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
