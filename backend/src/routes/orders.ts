import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/orders
router.get('/', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = `SELECT o.*, u.name as customer_name, v.store_name as vendor_name FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id WHERE `;
    const params: any[] = [];

    if (userPayload.role === 'customer') {
      query += `o.customer_id = ?`;
      params.push(userPayload.userId);
    } else if (userPayload.role === 'vendor') {
      const vendor = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(userPayload.userId) as any;
      if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
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
      return { ...order, tracking_updates: JSON.parse(order.tracking_updates || '[]'), items };
    });

    return res.json({ success: true, data: ordersWithItems });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const order = db.prepare(`SELECT o.*, u.name as customer_name, u.phone as customer_phone, v.store_name as vendor_name FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id WHERE o.id = ?`).get(id) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (userPayload.role === 'customer' && order.customer_id !== userPayload.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return res.json({ success: true, data: { ...order, tracking_updates: JSON.parse(order.tracking_updates || '[]'), items } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders
router.post('/', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload || userPayload.role !== 'customer') {
      return res.status(403).json({ success: false, error: 'Customer access required' });
    }

    const db = getDB();
    const { items, delivery_address, delivery_city, delivery_lat, delivery_lng, payment_method, notes } = req.body;

    if (!items?.length || !delivery_address || !delivery_city) {
      return res.status(400).json({ success: false, error: 'Items and delivery address are required' });
    }

    const vendorGroups: Record<string, any[]> = {};
    for (const item of items) {
      const product = db.prepare('SELECT p.*, v.id as vendor_id, v.user_id as vendor_user_id, v.store_name FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ? AND p.is_active = 1').get(item.product_id) as any;
      if (!product) return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` });
      if (product.stock < item.quantity) return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name}` });

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

      const trackingUpdates = JSON.stringify([{ status: 'pending', message: 'Order placed successfully', timestamp: new Date().toISOString() }]);

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

      const vendorUser = db.prepare('SELECT user_id FROM vendors WHERE id = ?').get(vendorId) as any;
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId) as any;
      const customer = db.prepare('SELECT name FROM users WHERE id=?').get(userPayload.userId) as any;

      if (vendorUser) {
        const productNames = vendorItems.map((i: any) => i.product.name).join(', ');
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'new_order', ?, ?, ?)`).run(
          uuidv4(), vendorUser.user_id, '🛒 New Order Received!',
          `${customer?.name || 'A customer'} just purchased from your store! Order #${orderId.slice(0,8).toUpperCase()} — ${productNames}. Total: ₦${totalAmount.toLocaleString()}`,
          JSON.stringify({ order_id: orderId, amount: totalAmount, customer_id: userPayload.userId, customer_name: customer?.name, product_names: productNames })
        );

        // Notify admin too
        const admins = db.prepare(`SELECT id FROM users WHERE role='admin'`).all() as any[];
        for (const admin of admins) {
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'admin_new_order', ?, ?, ?)`).run(
            uuidv4(), admin.id, '🧾 New Purchase',
            `${customer?.name || 'Customer'} bought from ${vendor?.store_name}: ₦${totalAmount.toLocaleString()}`,
            JSON.stringify({ order_id: orderId, vendor_id: vendorId, customer_id: userPayload.userId })
          );
        }
      }

      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'order_confirmed', ?, ?, ?)`).run(
        uuidv4(), userPayload.userId, '✅ Order Confirmed!',
        `Your order from ${vendor?.store_name} has been placed! Expected delivery within 48 hours.`,
        JSON.stringify({ order_id: orderId })
      );

      db.prepare(`INSERT INTO transactions (id, order_id, user_id, amount, type, status, payment_method) VALUES (?, ?, ?, ?, 'payment', 'completed', ?)`).run(
        uuidv4(), orderId, userPayload.userId, totalAmount, payment_method || 'card'
      );
      db.prepare(`UPDATE vendors SET total_sales = total_sales + ? WHERE id = ?`).run(subtotal, vendorId);
      createdOrders.push({ id: orderId, total: totalAmount });
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userPayload.userId);
    return res.status(201).json({ success: true, data: createdOrders, message: 'Orders placed successfully!' });
  } catch (error: any) {
    console.error('Order error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(order.vendor_id) as any;
    if (vendor?.user_id !== userPayload.userId && userPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

    const tracking_updates = JSON.parse(order.tracking_updates || '[]');
    const statusMessages: Record<string, string> = {
      confirmed: 'Order confirmed by vendor',
      processing: 'Order is being prepared',
      shipped: 'Order is on its way to you',
      delivered: 'Order delivered successfully',
      cancelled: 'Order has been cancelled'
    };

    tracking_updates.push({ status, message: statusMessages[status] || `Order status updated to ${status}`, timestamp: new Date().toISOString() });
    const actualDelivery = status === 'delivered' ? new Date().toISOString() : order.actual_delivery;

    db.prepare(`UPDATE orders SET status = ?, tracking_updates = ?, actual_delivery = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status, JSON.stringify(tracking_updates), actualDelivery, id
    );

    const notifMessages: Record<string, { title: string, msg: string }> = {
      confirmed: { title: '✅ Order Confirmed!', msg: `Your order #${id.slice(-6)} has been confirmed.` },
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
    return res.json({ success: true, data: { ...updated, tracking_updates: JSON.parse(updated.tracking_updates) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
