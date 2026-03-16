import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ['vendor']);
  if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const db = getDB();
    const vendor = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(auth.user.userId) as any;
    if (!vendor) return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });

    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE vendor_id = ?').get(vendor.id) as any).count;
    const totalRevenue = (db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE vendor_id = ? AND payment_status = 'completed'`).get(vendor.id) as any).total;
    const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE vendor_id = ? AND is_active = 1').get(vendor.id) as any).count;
    const pendingOrders = (db.prepare(`SELECT COUNT(*) as count FROM orders WHERE vendor_id = ? AND status = 'pending'`).get(vendor.id) as any).count;
    const lowStockProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE vendor_id = ? AND stock < 5 AND is_active = 1').get(vendor.id) as any).count;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total_amount) as revenue 
      FROM orders WHERE vendor_id = ? AND payment_status = 'completed' 
      GROUP BY month ORDER BY month DESC LIMIT 6`).all(vendor.id);

    const topProducts = db.prepare(`
      SELECT p.name, p.total_sales, p.stock, p.price, p.rating 
      FROM products p WHERE p.vendor_id = ? AND p.is_active = 1 
      ORDER BY p.total_sales DESC LIMIT 5`).all(vendor.id);

    const recentOrders = db.prepare(`
      SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.customer_id = u.id 
      WHERE o.vendor_id = ? ORDER BY o.created_at DESC LIMIT 5`).all(vendor.id) as any[];

    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders WHERE vendor_id = ? GROUP BY status`).all(vendor.id);

    return NextResponse.json({
      success: true,
      data: {
        vendor,
        stats: { totalOrders, totalRevenue, totalProducts, pendingOrders, lowStockProducts },
        monthlyRevenue,
        topProducts,
        recentOrders: recentOrders.map(o => ({ ...o, tracking_updates: JSON.parse(o.tracking_updates || '[]') })),
        ordersByStatus
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
