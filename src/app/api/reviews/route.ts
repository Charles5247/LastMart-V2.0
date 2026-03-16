import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    const productId = searchParams.get('product_id');

    let query = `SELECT r.*, u.name as customer_name, u.avatar as customer_avatar FROM reviews r JOIN users u ON r.customer_id = u.id WHERE 1=1`;
    const params: any[] = [];

    if (vendorId) { query += ` AND r.vendor_id = ?`; params.push(vendorId); }
    if (productId) { query += ` AND r.product_id = ?`; params.push(productId); }
    query += ` ORDER BY r.created_at DESC`;

    const reviews = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: reviews });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload || userPayload.role !== 'customer') {
      return NextResponse.json({ success: false, error: 'Customer access required' }, { status: 403 });
    }

    const db = getDB();
    const { vendor_id, product_id, order_id, rating, comment } = await request.json();

    if (!vendor_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Vendor ID and valid rating (1-5) are required' }, { status: 400 });
    }

    const reviewId = uuidv4();
    db.prepare(`INSERT INTO reviews (id, customer_id, vendor_id, product_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      reviewId, userPayload.userId, vendor_id, product_id || null, order_id || null, rating, comment || null
    );

    // Update vendor rating
    const avgResult = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE vendor_id = ?').get(vendor_id) as any;
    db.prepare('UPDATE vendors SET rating = ?, total_reviews = ? WHERE id = ?').run(
      parseFloat(avgResult.avg_rating.toFixed(1)), avgResult.total, vendor_id
    );

    // Update product rating if applicable
    if (product_id) {
      const prodAvg = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?').get(product_id) as any;
      db.prepare('UPDATE products SET rating = ?, total_reviews = ? WHERE id = ?').run(
        parseFloat(prodAvg.avg_rating.toFixed(1)), prodAvg.total, product_id
      );
    }

    // Notify vendor
    const vendorUser = db.prepare('SELECT user_id, store_name FROM vendors WHERE id = ?').get(vendor_id) as any;
    if (vendorUser) {
      const stars = '⭐'.repeat(rating);
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'new_review', ?, ?)`).run(
        uuidv4(), vendorUser.user_id, '⭐ New Customer Review!',
        `A customer left a ${rating}-star review (${stars}) for your store. Keep up the great work!`
      );
    }

    return NextResponse.json({ success: true, message: 'Review submitted successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
