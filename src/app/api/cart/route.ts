import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const items = db.prepare(`
      SELECT ci.*, p.name as product_name, p.price, p.original_price, p.images, p.stock, p.unit,
             v.store_name as vendor_name, v.id as vendor_id, v.city as vendor_city, v.status as vendor_status
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      JOIN vendors v ON p.vendor_id = v.id
      WHERE ci.user_id = ?`).all(userPayload.userId) as any[];

    const parsed = items.map(item => ({
      ...item,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        original_price: item.original_price,
        images: JSON.parse(item.images || '[]'),
        stock: item.stock,
        unit: item.unit,
        vendor_name: item.vendor_name,
        vendor_id: item.vendor_id,
        vendor_city: item.vendor_city
      }
    }));

    const total = parsed.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return NextResponse.json({ success: true, data: { items: parsed, total, count: parsed.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const { product_id, quantity = 1 } = await request.json();

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(product_id) as any;
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    if (product.stock < quantity) return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 });

    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userPayload.userId, product_id) as any;

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 });
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(
        uuidv4(), userPayload.userId, product_id, quantity
      );
    }

    return NextResponse.json({ success: true, message: 'Item added to cart' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const { item_id, quantity } = await request.json();

    if (quantity <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(item_id, userPayload.userId);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?').run(quantity, item_id, userPayload.userId);
    }

    return NextResponse.json({ success: true, message: 'Cart updated' });
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
    const itemId = searchParams.get('item_id');
    const clearAll = searchParams.get('clear_all');

    if (clearAll === 'true') {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userPayload.userId);
    } else if (itemId) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(itemId, userPayload.userId);
    }

    return NextResponse.json({ success: true, message: 'Cart updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
