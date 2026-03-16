import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ['admin']);
  if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const db = getDB();

    // Platform stats
    const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as any).count;
    const totalVendors = (db.prepare('SELECT COUNT(*) as count FROM vendors').get() as any).count;
    const activeVendors = (db.prepare("SELECT COUNT(*) as count FROM vendors WHERE status = 'approved'").get() as any).count;
    const pendingVendors = (db.prepare("SELECT COUNT(*) as count FROM vendors WHERE status = 'pending'").get() as any).count;
    const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as any).count;
    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count;
    const totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'completed'").get() as any).total;
    const todayOrders = (db.prepare(`SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')`).get() as any).count;
    
    // Monthly revenue for chart
    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, 
             COUNT(*) as orders, 
             SUM(total_amount) as revenue 
      FROM orders WHERE payment_status = 'completed' 
      GROUP BY month ORDER BY month DESC LIMIT 6`).all();

    // Top vendors
    const topVendors = db.prepare(`SELECT v.store_name, v.total_sales, v.rating, v.city, COUNT(o.id) as order_count FROM vendors v LEFT JOIN orders o ON v.id = o.vendor_id WHERE v.status = 'approved' GROUP BY v.id ORDER BY v.total_sales DESC LIMIT 5`).all();

    // Recent orders
    const recentOrders = db.prepare(`SELECT o.*, u.name as customer_name, v.store_name as vendor_name FROM orders o JOIN users u ON o.customer_id = u.id JOIN vendors v ON o.vendor_id = v.id ORDER BY o.created_at DESC LIMIT 10`).all() as any[];

    // Category distribution
    const categoryDist = db.prepare(`SELECT c.name, COUNT(p.id) as count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 GROUP BY c.id`).all();

    return NextResponse.json({
      success: true,
      data: {
        stats: { totalUsers, totalVendors, activeVendors, pendingVendors, totalProducts, totalOrders, totalRevenue, todayOrders },
        monthlyRevenue,
        topVendors,
        recentOrders: recentOrders.map(o => ({ ...o, tracking_updates: JSON.parse(o.tracking_updates || '[]') })),
        categoryDist
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
