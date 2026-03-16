'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Package, ShoppingBag, TrendingUp, Bell, Star, Plus, Settings, BarChart2, Megaphone, AlertTriangle, CheckCircle, Clock, DollarSign, ArrowRight, Users } from 'lucide-react';
import { formatPrice, getStatusColor, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function VendorDashboard() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'vendor') { router.push('/'); return; }
    if (user?.role === 'vendor') fetchAnalytics();
  }, [user, isLoading]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await fetch('/api/vendors/analytics', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setAnalytics(data.data);
    setLoading(false);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  if (!vendor && !loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-gray-800 mb-3">No Store Found</h2>
        <p className="text-gray-500 mb-6">Your vendor profile isn't set up yet.</p>
        <Link href="/auth/register?role=vendor" className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold">Create Store</Link>
      </div>
    </div>
  );

  const stats = analytics?.stats;
  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                {vendor?.store_name?.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{vendor?.store_name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vendor?.status === 'approved' ? 'bg-green-400/30 text-green-100' : 'bg-yellow-400/30 text-yellow-100'}`}>{vendor?.status?.toUpperCase()}</span>
                  <span className="text-orange-100 text-sm flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />{vendor?.rating} ({vendor?.total_reviews} reviews)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/dashboard/vendor/products" className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/30 transition-all">
                <Plus className="w-4 h-4" /> Add Product
              </Link>
              <Link href="/dashboard/vendor/analytics" className="flex items-center gap-2 bg-white text-orange-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-50 transition-all shadow">
                <TrendingUp className="w-4 h-4" /> Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Warning */}
        {vendor?.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Store Pending Approval</p>
              <p className="text-yellow-700 text-sm">Your store is under review. You'll be notified once it's approved and you can start selling.</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: 'from-green-400 to-green-600' },
            { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'from-blue-400 to-blue-600' },
            { label: 'Products', value: stats?.totalProducts || 0, icon: Package, color: 'from-purple-400 to-purple-600' },
            { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: Clock, color: 'from-orange-400 to-orange-600' },
            { label: 'Low Stock', value: stats?.lowStockProducts || 0, icon: AlertTriangle, color: 'from-red-400 to-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xl font-black text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-500" /> Revenue Overview</h3>
            {analytics?.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.monthlyRevenue.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPrice(v)} />
                  <Bar dataKey="revenue" fill="url(#orangeGradient)" radius={[6,6,0,0]} />
                  <defs>
                    <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-400">
                <div className="text-center"><BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>No revenue data yet</p></div>
              </div>
            )}
          </div>

          {/* Order Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-orange-500" /> Orders by Status</h3>
            {analytics?.ordersByStatus?.length > 0 ? (
              <div className="space-y-3">
                {analytics.ordersByStatus.map((s: any) => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(s.status)} flex-shrink-0 w-24 text-center`}>{s.status}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-400 to-pink-500 h-full rounded-full" style={{ width: `${(s.count / stats.totalOrders) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-6 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
            )}
          </div>
        </div>

        {/* Top Products & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Package className="w-5 h-5 text-orange-500" /> Top Products</h3>
              <Link href="/dashboard/vendor/products" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">Manage <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {analytics?.topProducts?.length > 0 ? (
              <div className="space-y-3">
                {analytics.topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.total_sales} sold · {p.stock} left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{formatPrice(p.price)}</p>
                      <div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-xs text-gray-500">{p.rating}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No products yet</p>
                <Link href="/dashboard/vendor/products" className="text-orange-500 text-sm font-medium mt-2 block">Add your first product</Link>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-orange-500" /> Recent Orders</h3>
              <Link href="/dashboard/vendor/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {analytics?.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">#{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{order.customer_name} · {formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{formatPrice(order.total_amount)}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">No orders yet</p>
            )}
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
          {[
            { href: '/dashboard/vendor/products', icon: Package, label: 'Products', color: 'text-purple-600 bg-purple-50' },
            { href: '/dashboard/vendor/inventory', icon: AlertTriangle, label: 'Inventory', color: 'text-red-600 bg-red-50' },
            { href: '/dashboard/vendor/orders', icon: ShoppingBag, label: 'Orders', color: 'text-blue-600 bg-blue-50' },
            { href: '/dashboard/vendor/analytics', icon: TrendingUp, label: 'Analytics', color: 'text-green-600 bg-green-50' },
            { href: '/dashboard/vendor/ads', icon: Megaphone, label: 'Advertise', color: 'text-orange-600 bg-orange-50' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 hover:shadow-md transition-shadow border border-gray-100">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${link.color}`}>
                <link.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-gray-700">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
