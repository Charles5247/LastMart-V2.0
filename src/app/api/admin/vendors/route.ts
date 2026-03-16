import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ['admin']);
  if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = `SELECT v.*, u.name as user_name, u.email as user_email FROM vendors v JOIN users u ON v.user_id = u.id WHERE 1=1`;
    const params: any[] = [];

    if (status) { query += ` AND v.status = ?`; params.push(status); }
    if (search) { query += ` AND (v.store_name LIKE ? OR u.name LIKE ? OR v.city LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ` ORDER BY v.created_at DESC`;

    const vendors = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: vendors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAuth(request, ['admin']);
  if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const db = getDB();
    const { vendor_id, status, is_featured } = await request.json();

    if (!vendor_id) return NextResponse.json({ success: false, error: 'Vendor ID required' }, { status: 400 });

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (status) { updateFields.push('status = ?'); updateValues.push(status); }
    if (is_featured !== undefined) { updateFields.push('is_featured = ?'); updateValues.push(is_featured); }
    updateFields.push("updated_at = datetime('now')");
    updateValues.push(vendor_id);

    db.prepare(`UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    // Notify vendor about status change
    if (status) {
      const vendor = db.prepare('SELECT v.user_id, v.store_name FROM vendors v WHERE v.id = ?').get(vendor_id) as any;
      if (vendor) {
        const messages: Record<string, { title: string, msg: string }> = {
          approved: { title: '🎉 Store Approved!', msg: `Your store "${vendor.store_name}" has been approved! You can now start selling on LastMart.` },
          suspended: { title: '⚠️ Store Suspended', msg: `Your store "${vendor.store_name}" has been temporarily suspended. Contact support for more information.` },
        };
        if (messages[status]) {
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
            uuidv4(), vendor.user_id, `vendor_${status}`, messages[status].title, messages[status].msg
          );
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Vendor updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
