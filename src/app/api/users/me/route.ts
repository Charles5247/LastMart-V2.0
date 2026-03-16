import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const user = db.prepare('SELECT id, name, email, role, avatar, phone, address, city, latitude, longitude, created_at FROM users WHERE id = ?').get(userPayload.userId) as any;
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.id);
    }

    return NextResponse.json({ success: true, data: { user, vendor: vendorInfo } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const body = await request.json();
    const { name, phone, address, city, latitude, longitude } = body;

    db.prepare(`UPDATE users SET name = ?, phone = ?, address = ?, city = ?, latitude = ?, longitude = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name, phone || null, address || null, city || null, latitude || null, longitude || null, userPayload.userId
    );

    const user = db.prepare('SELECT id, name, email, role, avatar, phone, address, city, latitude, longitude FROM users WHERE id = ?').get(userPayload.userId);
    return NextResponse.json({ success: true, data: user, message: 'Profile updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
