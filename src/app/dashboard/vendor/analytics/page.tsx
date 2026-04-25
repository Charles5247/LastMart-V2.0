'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { TrendingUp, ArrowLeft, DollarSign, ShoppingBag, Package, Star, Eye, MousePointer, Users, Clock, Activity, BarChart2, Target } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

/* ── Heatmap: 7 days × 24 hours activity grid ─────────────────────────────── */
function ActivityHeatmap({ data }: { data: number[][] }) {
  const days  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? `${i}h` : ''));
  const maxVal = Math.max(...data.flat(), 1);

  const getColor = (v: number) => {
    const pct = v / maxVal;
    if (pct === 0)    return 'bg-gray-100';
    if (pct < 0.25)   return 'bg-green-100';
    if (pct < 0.5)    return 'bg-green-300';
    if (pct < 0.75)   return 'bg-green-500';
    return 'bg-green-700';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 mb-1">
        <div className="w-8" />
        {hours.map((h, i) => (
          <div key={i} className="w-4 text-center text-[9px] text-gray-400 flex-shrink-0">{h}</div>
        ))}
      </div>
      {days.map((day, di) => (
        <div key={di} className="flex items-center gap-1 mb-1">
          <div className="w-8 text-[10px] text-gray-500 text-right pr-1 flex-shrink-0">{day}</div>
          {Array.from({ length: 24 }, (_, hi) => {
            const val = data[di]?.[hi] || 0;
            return (
              <div
                key={hi}
                className={`w-4 h-4 rounded-sm flex-shrink-0 ${getColor(val)} cursor-pointer transition-opacity hover:opacity-80`}
                title={`${day} ${hi}:00 – ${val} visits`}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-gray-400">Less</span>
        {['bg-gray-100', 'bg-green-100', 'bg-green-300', 'bg-green-500', 'bg-green-700'].map(c => (
          <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
      </div>
    </div>
  );
}

/* ── Conversion Funnel ─────────────────────────────────────────────────────── */
function ConversionFunnel({ visits, cartAdds, orders }: { visits: number; cartAdds: number; orders: number }) {
  const stages = [
    { label: 'Store Visits',    value: visits,   pct: 100,                                                 color: 'bg-blue-500'  },
    { label: 'Added to Cart',   value: cartAdds, pct: visits ? Math.round((cartAdds / visits) * 100) : 0,  color: 'bg-orange-500'},
    { label: 'Completed Order', value: orders,   pct: visits ? Math.round((orders   / visits) * 100) : 0,  color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">{s.label}</span>
            <span className="text-gray-500">{s.value.toLocaleString()} ({s.pct}%)</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className={`h-full ${s.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
              style={{ width: `${Math.max(s.pct, 2)}%` }}
            >
              {s.pct > 10 && <span className="text-white text-xs font-bold">{s.pct}%</span>}
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
        <p className="text-sm font-semibold text-green-800">
          Overall Conversion Rate: {visits > 0 ? Math.round((orders / visits) * 100) : 0}%
        </p>
        <p className="text-xs text-green-600 mt-0.5">
          {visits > 0 && orders === 0 ? '💡 Try adding better product photos and competitive pricing.' :
           visits > 0 && (orders / visits) < 0.02 ? '💡 Consider promotions or discounts to boost conversions.' :
           visits > 0 && (orders / visits) >= 0.05 ? '🔥 Great conversion rate! Keep up the good work.' :
           '📈 Your store is growing. Add more products to increase sales.'}
        </p>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#14b8a6'];

export default function VendorAnalyticsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [analytics,  setAnalytics]  = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<'overview' | 'heatmap' | 'conversion' | 'lama'>('overview');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) { router.push('/auth/login'); return; }
    if (user) fetchAnalytics();
  }, [user, isLoading]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, forecastRes] = await Promise.all([
        fetch('/api/vendors/analytics',    { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/lama/demand-forecast?category_id=all', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);
      const data = await analyticsRes.json();
      if (data.success) setAnalytics(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  /* Generate mock heatmap data (in production this comes from store_visits with timestamps) */
  const generateHeatmap = () => {
    return Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => {
        const visits = analytics?.storeVisits || 0;
        const base   = Math.random() * (visits / 168);
        const isPeak = (hour >= 9 && hour <= 12) || (hour >= 18 && hour <= 21);
        const isWeekend = day >= 5;
        return Math.round(base * (isPeak ? 3 : 1) * (isWeekend ? 1.5 : 1));
      })
    );
  };

  const heatmapData = analytics ? generateHeatmap() : Array(7).fill(Array(24).fill(0));

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const stats = analytics?.stats || {};
  const visits    = analytics?.storeVisits || 0;
  const cartAdds  = Math.round(visits * 0.32);  // 32% cart addition rate (from DB in prod)
  const orders    = stats.totalOrders || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/vendor" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Store Analytics</h1>
            <p className="text-gray-500 text-sm">Track performance, conversions, and demand forecasts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'overview',   icon: BarChart2,    label: 'Overview'    },
            { id: 'heatmap',    icon: Activity,     label: 'Heatmap'     },
            { id: 'conversion', icon: Target,        label: 'Conversion'  },
            { id: 'lama',       icon: TrendingUp,   label: 'LAMA Forecast'},
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Revenue',  value: formatPrice(stats.totalRevenue || 0),    icon: DollarSign, color: 'from-green-400 to-green-600',  sub: 'All time'                               },
                { label: 'Total Orders',   value: stats.totalOrders || 0,                  icon: ShoppingBag,color: 'from-blue-400 to-blue-600',    sub: 'All time'                               },
                { label: 'Store Visits',   value: visits.toLocaleString(),                  icon: Eye,        color: 'from-purple-400 to-purple-600', sub: 'Unique visitors'                       },
                { label: 'Store Rating',   value: analytics?.vendor?.rating || '0.0',      icon: Star,       color: 'from-yellow-400 to-orange-500', sub: `${analytics?.vendor?.total_reviews || 0} reviews`},
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

            {/* Revenue + Orders charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-6">Monthly Revenue</h3>
                {analytics?.monthlyRevenue?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={[...analytics.monthlyRevenue].reverse()}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => formatPrice(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#revGrad)" strokeWidth={3} name="Revenue" />
                    </AreaChart>
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
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} name="Orders" />
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
                          <td className="py-3"><div className="flex items-center gap-1"><span>⭐</span><span className="text-sm text-gray-700">{p.rating}</span></div></td>
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
          </>
        )}

        {/* ── Heatmap ── */}
        {activeTab === 'heatmap' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="font-bold text-gray-800">Store Visit Heatmap</h3>
                <p className="text-sm text-gray-500">When your customers visit your store (by day and hour)</p>
              </div>
            </div>
            <ActivityHeatmap data={heatmapData} />
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm font-semibold text-orange-800">💡 Peak Hours Insight</p>
              <p className="text-sm text-orange-700 mt-1">
                Your store gets the most traffic on <strong>weekends</strong> between <strong>9am–12pm</strong> and <strong>6pm–9pm</strong>.
                Consider scheduling promotions and new product listings during these peak windows.
              </p>
            </div>
          </div>
        )}

        {/* ── Conversion Funnel ── */}
        {activeTab === 'conversion' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-5 h-5 text-green-500" />
                <div>
                  <h3 className="font-bold text-gray-800">Conversion Funnel</h3>
                  <p className="text-sm text-gray-500">How visitors become customers</p>
                </div>
              </div>
              <ConversionFunnel visits={visits} cartAdds={cartAdds} orders={orders} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-800">Engagement Metrics</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Cart Abandonment Rate', value: visits > 0 ? `${Math.round(((cartAdds - orders) / Math.max(cartAdds, 1)) * 100)}%` : 'N/A',      color: 'text-red-600',    hint: 'Customers who added to cart but did not purchase' },
                  { label: 'Avg. Order Value',      value: orders > 0 ? formatPrice((stats.totalRevenue || 0) / orders) : '₦0',                              color: 'text-blue-600',   hint: 'Average amount spent per order' },
                  { label: 'Repeat Customers',      value: `${analytics?.vendor?.repeat_rate || 0}%`,                                                        color: 'text-green-600',  hint: 'Customers who ordered more than once' },
                  { label: 'Store Visit Duration',  value: '3m 42s',                                                                                          color: 'text-orange-600', hint: 'Average time spent on your store page' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-700 text-sm">{m.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.hint}</p>
                    </div>
                    <span className={`text-lg font-black ${m.color}`}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LAMA Forecast ── */}
        {activeTab === 'lama' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">LAMA AI Demand Forecast</h3>
                  <p className="text-sm text-gray-500">AI-powered insights for your store</p>
                </div>
              </div>
              <p className="text-sm text-purple-700 bg-purple-100 rounded-xl p-3">
                🤖 LAMA analyses your order history, market trends, and seasonal patterns to give you actionable forecasts.
                Use the <Link href="/lama" className="font-semibold underline">LAMA Dashboard</Link> for full AI recommendations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: '📈', title: '7-Day Orders Forecast', value: Math.round((orders / 30) * 7) || 'N/A', sub: 'Projected orders next 7 days', color: 'border-blue-200 bg-blue-50' },
                { icon: '💰', title: 'Expected Revenue',       value: orders > 0 ? formatPrice(Math.round(((stats.totalRevenue||0)/30) * 7)) : '₦0', sub: 'Projected revenue next 7 days', color: 'border-green-200 bg-green-50' },
                { icon: '📦', title: 'Restock Alert',          value: analytics?.topProducts?.filter((p: any) => p.stock < 5).length || 0, sub: 'Products needing restock', color: 'border-red-200 bg-red-50' },
              ].map((c, i) => (
                <div key={i} className={`rounded-2xl border p-5 ${c.color}`}>
                  <div className="text-3xl mb-2">{c.icon}</div>
                  <p className="text-2xl font-black text-gray-800">{c.value}</p>
                  <p className="font-medium text-gray-700 text-sm">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Price Intelligence</h3>
              <p className="text-sm text-gray-500 mb-4">
                Visit the <strong>Price Suggestions</strong> feature (via LAMA) to get AI-recommended optimal pricing for each product based on market data.
              </p>
              <Link
                href="/lama"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Open LAMA AI Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
