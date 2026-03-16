'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { TrendingUp, ArrowLeft, DollarSign, ShoppingBag, Package, Star } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function VendorAnalyticsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) { router.push('/auth/login'); return; }
    if (user) fetchAnalytics();
  }, [user, isLoading]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await fetch('/api/vendors/analytics', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setAnalytics(data.data);
    setLoading(false);
  };

  const PIE_COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#eab308'];

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/vendor" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Sales Analytics</h1>
            <p className="text-gray-500 text-sm">Track your store performance</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: formatPrice(analytics?.stats?.totalRevenue || 0), icon: DollarSign, color: 'from-green-400 to-green-600', sub: 'All time' },
            { label: 'Total Orders', value: analytics?.stats?.totalOrders || 0, icon: ShoppingBag, color: 'from-blue-400 to-blue-600', sub: 'All time' },
            { label: 'Products', value: analytics?.stats?.totalProducts || 0, icon: Package, color: 'from-purple-400 to-purple-600', sub: 'Active' },
            { label: 'Store Rating', value: analytics?.vendor?.rating || 0, icon: Star, color: 'from-yellow-400 to-orange-500', sub: `${analytics?.vendor?.total_reviews || 0} reviews` },
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

        {/* Revenue Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6">Monthly Revenue</h3>
            {analytics?.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...analytics.monthlyRevenue].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPrice(v)} labelFormatter={l => `Month: ${l}`} />
                  <Bar dataKey="revenue" fill="#f97316" radius={[6,6,0,0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-60 flex items-center justify-center text-gray-300">No data yet</div>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-6">Orders Over Time</h3>
            {analytics?.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={[...analytics.monthlyRevenue].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', strokeWidth: 2 }} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-60 flex items-center justify-center text-gray-300">No data yet</div>}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-6">Top Performing Products</h3>
          {analytics?.topProducts?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Rank', 'Product', 'Price', 'Sales', 'Stock', 'Rating'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analytics.topProducts.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4"><span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xs font-bold">{i+1}</span></td>
                      <td className="py-3 pr-4"><p className="font-medium text-gray-800 text-sm">{p.name}</p></td>
                      <td className="py-3 pr-4"><span className="text-sm font-bold text-gray-800">{formatPrice(p.price)}</span></td>
                      <td className="py-3 pr-4"><span className="text-sm text-gray-700">{p.total_sales} units</span></td>
                      <td className="py-3 pr-4"><span className={`text-sm font-medium ${p.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>{p.stock}</span></td>
                      <td className="py-3"><div className="flex items-center gap-1"><span className="text-yellow-400">⭐</span><span className="text-sm text-gray-700">{p.rating}</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p>Start selling to see analytics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
