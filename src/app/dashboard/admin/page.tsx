'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Users, Store, Package, ShoppingBag, DollarSign, TrendingUp, BarChart2, ArrowRight, AlertTriangle, CheckCircle, Clock, Shield, Crown, Ban, Eye, Star, Bell } from 'lucide-react';
import { formatPrice, getStatusColor, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') fetchAnalytics();
  }, [user, isLoading]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setAnalytics(data.data);
    setLoading(false);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  const stats = analytics?.stats;
  const PIE_COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#f43f5e', '#06b6d4'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">LastMart Platform Overview</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Today's Orders</p>
              <p className="text-3xl font-black text-orange-400">{stats?.todayOrders || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: 'from-green-400 to-green-600', change: '+12%' },
            { label: 'Total Users', value: (stats?.totalUsers || 0).toLocaleString(), icon: Users, color: 'from-blue-400 to-blue-600', change: '+5%' },
            { label: 'Active Vendors', value: stats?.activeVendors || 0, icon: Store, color: 'from-purple-400 to-purple-600', change: '+3%' },
            { label: 'Total Orders', value: (stats?.totalOrders || 0).toLocaleString(), icon: ShoppingBag, color: 'from-orange-400 to-orange-600', change: '+8%' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{s.change}</span>
              </div>
              <p className="text-2xl font-black text-gray-800">{s.value}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending Actions */}
        {(stats?.pendingVendors > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-800">{stats.pendingVendors} vendor(s) awaiting approval</p>
                <p className="text-yellow-700 text-sm">Review and approve new vendor applications</p>
              </div>
            </div>
            <Link href="/dashboard/admin/vendors" className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors">
              Review Now
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-500" /> Monthly Revenue</h3>
            {analytics?.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[...analytics.monthlyRevenue].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPrice(v)} />
                  <Bar dataKey="revenue" radius={[6,6,0,0]}>
                    {analytics.monthlyRevenue.map((_: any, i: number) => <Cell key={i} fill={['#f97316','#ec4899','#8b5cf6','#3b82f6','#22c55e','#eab308'][i % 6]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-60 flex items-center justify-center text-gray-300">No revenue data</div>}
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-orange-500" /> Products by Category</h3>
            {analytics?.categoryDist?.length > 0 ? (
              <div className="flex items-center gap-4">
                <PieChart width={180} height={180}>
                  <Pie data={analytics.categoryDist} dataKey="count" cx={90} cy={90} innerRadius={50} outerRadius={80}>
                    {analytics.categoryDist.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-2">
                  {analytics.categoryDist.slice(0, 6).map((c: any, i: number) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
                      <span className="text-xs font-bold text-gray-800">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-60 flex items-center justify-center text-gray-300">No data</div>}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Store className="w-5 h-5 text-orange-500" /> Top Vendors</h3>
              <Link href="/dashboard/admin/vendors" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {analytics?.topVendors?.length > 0 ? (
              <div className="space-y-3">
                {analytics.topVendors.map((v: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{v.store_name}</p>
                      <p className="text-xs text-gray-400">{v.city} · {v.order_count} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-800">{formatPrice(v.total_sales)}</p>
                      <div className="flex items-center gap-0.5 justify-end"><span className="text-yellow-400 text-xs">⭐</span><span className="text-xs text-gray-500">{v.rating}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-gray-400 text-sm py-8">No vendors yet</p>}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-orange-500" /> Recent Orders</h3>
              <Link href="/dashboard/admin/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {analytics?.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentOrders.slice(0, 6).map((order: any) => (
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
            ) : <p className="text-center text-gray-400 text-sm py-8">No orders yet</p>}
          </div>
        </div>

        {/* Pending Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats?.pendingKyc > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-800 text-sm">{stats.pendingKyc} KYC pending</p>
                  <p className="text-purple-600 text-xs">Identity verifications</p>
                </div>
              </div>
              <Link href="/dashboard/admin/kyc" className="bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-600">Review</Link>
            </div>
          )}
          {stats?.pendingProductVerifications > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-teal-600" />
                <div>
                  <p className="font-semibold text-teal-800 text-sm">{stats.pendingProductVerifications} products to vet</p>
                  <p className="text-teal-600 text-xs">Authenticity reviews pending</p>
                </div>
              </div>
              <Link href="/dashboard/admin/product-verification" className="bg-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-600">Review</Link>
            </div>
          )}
          {stats?.rankingApps?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800 text-sm">{analytics?.rankingApps?.length || 0} ranking apps</p>
                  <p className="text-yellow-600 text-xs">Paid ranking applications</p>
                </div>
              </div>
              <Link href="/dashboard/admin/rankings" className="bg-yellow-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-yellow-600">Review</Link>
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Ranking Revenue', value: formatPrice(stats?.rankingRevenue || 0), icon: Crown, color: 'from-yellow-400 to-yellow-600' },
            { label: 'Store Visits (30d)', value: (stats?.totalVisits || 0).toLocaleString(), icon: Eye, color: 'from-teal-400 to-teal-600' },
            { label: 'Suspended Users', value: stats?.suspendedUsers || 0, icon: Ban, color: 'from-red-400 to-red-600' },
            { label: 'Active Rankings', value: stats?.activeRankings || 0, icon: Star, color: 'from-pink-400 to-pink-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center shadow mb-3`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xl font-black text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent KYC + Rankings */}
        {(analytics?.recentKyc?.length > 0 || analytics?.rankingApps?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {analytics?.recentKyc?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-500" /> Recent KYC Submissions</h3>
                  <Link href="/dashboard/admin/kyc" className="text-sm text-orange-500 font-medium flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="space-y-2">
                  {analytics.recentKyc.map((k: any) => (
                    <div key={k.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Shield className="w-8 h-8 text-purple-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{k.user_name}</p>
                        <p className="text-xs text-gray-400">{k.type === 'vendor_kyc' ? '🏪 Vendor KYC' : '👤 Customer KYC'} · {new Date(k.submitted_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${k.status === 'approved' ? 'bg-green-100 text-green-700' : k.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {k.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics?.rankingApps?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-500" /> Ranking Applications</h3>
                  <Link href="/dashboard/admin/rankings" className="text-sm text-orange-500 font-medium flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="space-y-2">
                  {analytics.rankingApps.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Crown className="w-8 h-8 text-yellow-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.store_name}</p>
                        <p className="text-xs text-gray-400">{r.pkg_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: '/dashboard/admin/vendors', icon: Store, label: 'Manage Vendors', badge: stats?.pendingVendors || 0, color: 'from-purple-400 to-purple-600' },
            { href: '/dashboard/admin/customers', icon: Users, label: 'Manage Customers', badge: stats?.suspendedUsers || 0, color: 'from-blue-400 to-blue-600' },
            { href: '/dashboard/admin/kyc', icon: Shield, label: 'KYC Reviews', badge: stats?.pendingKyc || 0, color: 'from-indigo-400 to-indigo-600' },
            { href: '/dashboard/admin/rankings', icon: Crown, label: 'Rankings & Ads', badge: analytics?.rankingApps?.length || 0, color: 'from-yellow-400 to-yellow-600' },
            { href: '/dashboard/admin/product-verification', icon: Package, label: 'Product Vetting', badge: stats?.pendingProductVerifications || 0, color: 'from-teal-400 to-teal-600' },
            { href: '/dashboard/admin/products', icon: Package, label: 'All Products', badge: 0, color: 'from-cyan-400 to-cyan-600' },
            { href: '/dashboard/admin/orders', icon: ShoppingBag, label: 'All Orders', badge: 0, color: 'from-orange-400 to-orange-600' },
            { href: '/dashboard/admin/notifications', icon: Bell, label: 'Send Notifications', badge: 0, color: 'from-pink-400 to-pink-600' },
            { href: '/dashboard/admin/analytics', icon: TrendingUp, label: 'Analytics', badge: 0, color: 'from-green-400 to-green-600' },
          ].map(link => (
            <Link key={link.href + link.label} href={link.href} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 hover:shadow-md transition-shadow border border-gray-100 relative">
              <div className={`w-12 h-12 bg-gradient-to-br ${link.color} rounded-2xl flex items-center justify-center shadow`}>
                <link.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-700 text-center">{link.label}</span>
              {link.badge > 0 && <span className="absolute top-3 right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{link.badge}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
