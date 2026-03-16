import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');

    let query = `SELECT o.*, u.name as customer_name, v.store_name as vendor_name FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id WHERE `;
    const params: any[] = [];

    if (userPayload.role === 'customer') {
      query += `o.customer_id = ?`;
      params.push(userPayload.userId);
    } else if (userPayload.role === 'vendor') {
      const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
      if (!vendor) return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
      query += `o.vendor_id = ?`;
      params.push(vendor.id);
    } else if (userPayload.role === 'admin') {
      query += `1=1`;
    }

    if (status) { query += ` AND o.status = ?`; params.push(status); }
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const orders = db.prepare(query).all(...params) as any[];
    const ordersWithItems = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return {
        ...order,
        tracking_updates: JSON.parse(order.tracking_updates || '[]'),
        items
      };
    });

    return NextResponse.json({ success: true, data: ordersWithItems });
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
    const body = await request.json();
    const { items, delivery_address, delivery_city, delivery_lat, delivery_lng, payment_method, notes } = body;

    if (!items?.length || !delivery_address || !delivery_city) {
      return NextResponse.json({ success: false, error: 'Items and delivery address are required' }, { status: 400 });
    }

    // Group by vendor and create separate orders
    const vendorGroups: Record<string, any[]> = {};
    for (const item of items) {
      const product = db.prepare('SELECT p.*, v.id as vendor_id, v.user_id as vendor_user_id, v.store_name FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ? AND p.is_active = 1').get(item.product_id) as any;
      if (!product) return NextResponse.json({ success: false, error: `Product ${item.product_id} not found` }, { status: 404 });
      if (product.stock < item.quantity) return NextResponse.json({ success: false, error: `Insufficient stock for ${product.name}` }, { status: 400 });

      if (!vendorGroups[product.vendor_id]) vendorGroups[product.vendor_id] = [];
      vendorGroups[product.vendor_id].push({ ...item, product });
    }

    const createdOrders = [];
    const estimatedDelivery = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    for (const [vendorId, vendorItems] of Object.entries(vendorGroups)) {
      const orderId = uuidv4();
      const subtotal = vendorItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
      const deliveryFee = 500;
      const totalAmount = subtotal + deliveryFee;

      const trackingUpdates = JSON.stringify([{
        status: 'pending',
        message: 'Order placed successfully',
        timestamp: new Date().toISOString()
      }]);

      db.prepare(`INSERT INTO orders (id, customer_id, vendor_id, status, total_amount, delivery_fee, delivery_address, delivery_city, delivery_lat, delivery_lng, payment_method, payment_status, notes, estimated_delivery, tracking_updates) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`).run(
        orderId, userPayload.userId, vendorId, totalAmount, deliveryFee,
        delivery_address, delivery_city, delivery_lat || null, delivery_lng || null,
        payment_method || 'card', notes || null, estimatedDelivery, trackingUpdates
      );

      for (const item of vendorItems) {
        db.prepare(`INSERT INTO order_items (id, order_id, product_id, quantity, price, product_name, product_image) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
          uuidv4(), orderId, item.product_id, item.quantity, item.product.price,
          item.product.name, JSON.parse(item.product.images || '[]')[0] || null
        );
        db.prepare(`UPDATE products SET stock = stock - ?, total_sales = total_sales + ? WHERE id = ?`).run(item.quantity, item.quantity, item.product_id);
      }

      // Notifications
      const vendorUser = db.prepare('SELECT user_id FROM vendors WHERE id = ?').get(vendorId) as any;
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId) as any;

      if (vendorUser) {
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'new_order', ?, ?, ?)`).run(
          uuidv4(), vendorUser.user_id, '🛒 New Order Received!',
          `You have a new order worth ₦${totalAmount.toLocaleString()}. Please confirm immediately.`,
          JSON.stringify({ order_id: orderId, amount: totalAmount })
        );
      }

      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'order_confirmed', ?, ?, ?)`).run(
        uuidv4(), userPayload.userId, '✅ Order Confirmed!',
        `Your order from ${vendor?.store_name} has been placed! Expected delivery within 48 hours.`,
        JSON.stringify({ order_id: orderId })
      );

      // Transaction record
      db.prepare(`INSERT INTO transactions (id, order_id, user_id, amount, type, status, payment_method) VALUES (?, ?, ?, ?, 'payment', 'completed', ?)`).run(
        uuidv4(), orderId, userPayload.userId, totalAmount, payment_method || 'card'
      );

      db.prepare(`UPDATE vendors SET total_sales = total_sales + ? WHERE id = ?`).run(subtotal, vendorId);
      createdOrders.push({ id: orderId, total: totalAmount });
    }

    // Clear cart
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userPayload.userId);

    return NextResponse.json({ success: true, data: createdOrders, message: 'Orders placed successfully!' }, { status: 201 });
  } catch (error: any) {
    console.error('Order error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
