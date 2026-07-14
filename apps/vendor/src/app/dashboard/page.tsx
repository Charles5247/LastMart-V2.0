'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store, Package, ShoppingBag, DollarSign, TrendingUp, BarChart2,
  Bell, Settings, QrCode, LogOut, Star, AlertTriangle, ArrowRight,
  Plus, CheckCircle, Clock, Users, Menu, X
} from 'lucide-react';
import { getStoredToken, getStoredUser, clearStoredToken, isVendorAuthenticated } from '@/lib/auth';
import { formatPrice, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

export default function VendorDashboard() {
  const router = useRouter();
  const [user,      setUser]      = useState<any>(null);
  const [vendor,    setVendor]    = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders,    setOrders]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [navOpen,   setNavOpen]   = useState(false);

  const token = getStoredToken();

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isVendorAuthenticated()) { router.replace('/auth/login'); return; }
    const stored = getStoredUser();
    setUser(stored);
    loadData();
  }, []); // eslint-disable-line

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, analyticsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/users/me`,          { headers: headers() }),
        fetch(`${API_URL}/vendors/me/analytics`, { headers: headers() }),
        fetch(`${API_URL}/orders?limit=5`,    { headers: headers() }),
      ]);
      const [profile, analyticsData, ordersData] = await Promise.all([
        profileRes.json(), analyticsRes.json(), ordersRes.json(),
      ]);
      if (profile.success)    { 
        setUser(profile.data.user); 
        setVendor(profile.data.vendor); 
      }
      if (analyticsData.success) setAnalytics(analyticsData.data);
      if (ordersData.success)    setOrders(ordersData.data?.orders ?? []);
    } catch { toast.error('Failed to load dashboard data'); }
    setLoading(false);
  };

  const handleLogout = () => {
    clearStoredToken();
    toast.success('Logged out');
    router.replace('/auth/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = analytics?.stats;

  const STAT_CARDS = [
    { label: 'Total Revenue',  value: formatPrice(stats?.totalRevenue || 0),  icon: DollarSign,  color: 'bg-green-500' },
    { label: 'Total Orders',   value: stats?.totalOrders || 0,                icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Total Products', value: stats?.totalProducts || 0,              icon: Package,     color: 'bg-purple-500' },
    { label: 'Store Rating',   value: `${(vendor?.rating || 0).toFixed(1)} ⭐`, icon: Star,       color: 'bg-yellow-500' },
  ];

  const NAV_ITEMS = [
    { href: '/dashboard',   label: 'Dashboard',  icon: BarChart2 },
    { href: '/products',    label: 'Products',   icon: Package },
    { href: '/orders',      label: 'Orders',     icon: ShoppingBag },
    { href: '/analytics',   label: 'Analytics',  icon: TrendingUp },
    { href: '/payouts',     label: 'Payouts',    icon: DollarSign },
    { href: '/settings',    label: 'Settings',   icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 transform transition-transform duration-200 ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:shrink-0`}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
            <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">LastMart Vendor</p>
              <p className="text-gray-400 text-xs truncate max-w-32">{vendor?.store_name || user?.name}</p>
            </div>
            <button onClick={() => setNavOpen(false)} className="lg:hidden ml-auto text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status badge */}
          {vendor && (
            <div className="px-6 py-3 border-b border-gray-700">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${vendor.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {vendor.status === 'approved' ? '✅ Approved Vendor' : '⏳ Pending Approval'}
              </span>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-gray-700">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {navOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setNavOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/products?action=new" className="btn-primary py-2 px-4 text-sm hidden sm:flex">
              <Plus className="w-4 h-4" /> Add Product
            </Link>
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Welcome */}
          <div className="bg-linear-to-r from-orange-500 to-pink-600 rounded-2xl p-6 text-white">
            <h2 className="text-xl font-black mb-1">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
            <p className="text-orange-100 text-sm">{vendor?.store_name || 'Your Store'} · {vendor?.city}</p>
          </div>

          {/* Vendor not approved warning */}
          {vendor?.status === 'pending' && (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-500" />
              <div>
                <p className="font-semibold">Store Pending Approval</p>
                <p className="mt-0.5">Your store is under review. You'll be notified once approved — usually within 24 hours.</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-5">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/products?action=new', label: 'Add Product',   icon: Plus,     bg: 'bg-orange-50 border-orange-200 text-orange-700' },
              { href: '/orders',              label: 'View Orders',   icon: ShoppingBag, bg: 'bg-blue-50 border-blue-200 text-blue-700' },
              { href: '/analytics',           label: 'Analytics',    icon: BarChart2, bg: 'bg-purple-50 border-purple-200 text-purple-700' },
              { href: '/payouts',             label: 'Payouts',       icon: DollarSign, bg: 'bg-green-50 border-green-200 text-green-700' },
            ].map(({ href, label, icon: Icon, bg }) => (
              <Link key={href} href={href} className={`flex flex-col items-center gap-2 p-4 border rounded-xl text-sm font-semibold ${bg} transition-all hover:shadow-sm`}>
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Recent orders */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Recent Orders</h3>
              <Link href="/orders" className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No orders yet. Share your store to start selling!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">Order ID</th>
                      <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">Customer</th>
                      <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">Amount</th>
                      <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">Status</th>
                      <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono text-xs text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3 font-medium text-gray-900">{o.customer_name || 'Customer'}</td>
                        <td className="py-3 font-bold text-gray-900">{formatPrice(o.total_amount)}</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(o.status)}`}>{o.status}</span></td>
                        <td className="py-3 text-gray-500">{formatDate(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
