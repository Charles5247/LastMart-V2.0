import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const order = db.prepare(`SELECT o.*, u.name as customer_name, u.phone as customer_phone, v.store_name as vendor_name FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id WHERE o.id = ?`).get(id) as any;
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    // Auth check
    if (userPayload.role === 'customer' && order.customer_id !== userPayload.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

    return NextResponse.json({
      success: true, data: {
        ...order,
        tracking_updates: JSON.parse(order.tracking_updates || '[]'),
        items
      }
    });
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
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(order.vendor_id) as any;

    if (vendor?.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { status } = await request.json();
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });

    const tracking_updates = JSON.parse(order.tracking_updates || '[]');
    const statusMessages: Record<string, string> = {
      confirmed: 'Order confirmed by vendor',
      processing: 'Order is being prepared',
      shipped: 'Order is on its way to you',
      delivered: 'Order delivered successfully',
      cancelled: 'Order has been cancelled'
    };

    tracking_updates.push({
      status,
      message: statusMessages[status] || `Order status updated to ${status}`,
      timestamp: new Date().toISOString()
    });

    const actualDelivery = status === 'delivered' ? new Date().toISOString() : order.actual_delivery;

    db.prepare(`UPDATE orders SET status = ?, tracking_updates = ?, actual_delivery = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status, JSON.stringify(tracking_updates), actualDelivery, id
    );

    const notifMessages: Record<string, { title: string, msg: string }> = {
      confirmed: { title: '✅ Order Confirmed!', msg: `Your order #${id.slice(-6)} has been confirmed and is being prepared.` },
      shipped: { title: '🚚 Order Shipped!', msg: `Your order is on its way! Expected delivery within 48 hours.` },
      delivered: { title: '🎉 Order Delivered!', msg: `Your order has been delivered. Enjoy your purchase!` },
      cancelled: { title: '❌ Order Cancelled', msg: `Your order #${id.slice(-6)} has been cancelled.` },
    };

    if (notifMessages[status]) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`).run(
        uuidv4(), order.customer_id, `order_${status}`,
        notifMessages[status].title, notifMessages[status].msg,
        JSON.stringify({ order_id: id })
      );
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    return NextResponse.json({ success: true, data: { ...updated, tracking_updates: JSON.parse(updated.tracking_updates) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
