'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { TrendingUp, ArrowLeft, Users, Store, Package, ShoppingBag, DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export default function AdminAnalyticsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) { router.push('/'); return; }
    if (user) {
      fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.success) setAnalytics(d.data); setLoading(false); });
    }
  }, [user, isLoading]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  const stats = analytics?.stats;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/admin" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Platform Analytics</h1>
            <p className="text-gray-500 text-sm">Full platform performance overview</p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: 'from-green-400 to-emerald-600', sub: 'Platform-wide' },
            { label: 'Customers', value: (stats?.totalUsers || 0).toLocaleString(), icon: Users, color: 'from-blue-400 to-blue-600', sub: 'Registered users' },
            { label: 'Total Products', value: (stats?.totalProducts || 0).toLocaleString(), icon: Package, color: 'from-purple-400 to-purple-600', sub: 'Active listings' },
            { label: 'Total Orders', value: (stats?.totalOrders || 0).toLocaleString(), icon: ShoppingBag, color: 'from-orange-400 to-red-500', sub: 'All time' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className={`w-12 h-12 bg-gradient-to-br ${m.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                <m.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-800">{m.value}</p>
              <p className="text-sm font-medium text-gray-500 mt-1">{m.label}</p>
              <p className="text-xs text-gray-400">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Vendor Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Vendors', value: stats?.totalVendors || 0, color: 'bg-purple-50 text-purple-800 border-purple-200' },
            { label: 'Approved Vendors', value: stats?.activeVendors || 0, color: 'bg-green-50 text-green-800 border-green-200' },
            { label: 'Pending Approval', value: stats?.pendingVendors || 0, color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-5 text-center ${s.color}`}>
              <p className="text-3xl font-black">{s.value}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue Area Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="font-bold text-gray-800 mb-6">Revenue Trend (Last 6 Months)</h3>
          {analytics?.monthlyRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={[...analytics.monthlyRevenue].reverse()}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fill="url(#revenueGrad)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-60 flex items-center justify-center text-gray-300">No data yet</div>}
        </div>

        {/* Orders and Top Vendors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6">Orders Per Month</h3>
            {analytics?.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[...analytics.monthlyRevenue].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4,4,0,0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-60 flex items-center justify-center text-gray-300">No data</div>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6">Category Distribution</h3>
            {analytics?.categoryDist?.length > 0 ? (
              <div className="space-y-3">
                {analytics.categoryDist.map((c: any, i: number) => {
                  const total = analytics.categoryDist.reduce((s: number, x: any) => s + x.count, 0);
                  const pct = total > 0 ? (c.count / total) * 100 : 0;
                  const colors = ['bg-orange-500', 'bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'];
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 truncate">{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`${colors[i % colors.length]} h-full rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-center text-gray-300 text-sm py-8">No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
