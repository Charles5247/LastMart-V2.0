import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB from '@/lib/db';
import { signToken } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

export async function POST(request: NextRequest) {
  try {
    await seedDatabase();
    const db = getDB();
    const body = await request.json();
    const { name, email, password, role, city, phone, address, latitude, longitude, store_name, store_description, category } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const userRole = role || 'customer';

    db.prepare(`INSERT INTO users (id, name, email, password, role, city, phone, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      userId, name, email, hashedPassword, userRole, city || null, phone || null, address || null, latitude || null, longitude || null
    );

    if (userRole === 'vendor') {
      if (!store_name) {
        return NextResponse.json({ success: false, error: 'Store name is required for vendors' }, { status: 400 });
      }
      const vendorId = uuidv4();
      db.prepare(`INSERT INTO vendors (id, user_id, store_name, description, category, city, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        vendorId, userId, store_name, store_description || null, category || null, city || '', latitude || null, longitude || null
      );
    }

    const user = db.prepare('SELECT id, name, email, role, city, created_at FROM users WHERE id = ?').get(userId) as any;
    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });

    const response = NextResponse.json({ success: true, data: { user, token }, message: 'Registration successful' });
    response.cookies.set('auth_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
