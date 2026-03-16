import { NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  try {
    await seedDatabase();
    const db = getDB();
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
