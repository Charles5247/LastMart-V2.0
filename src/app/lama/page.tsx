'use client';
/**
 * ─── LAMA AI Agent Dashboard ──────────────────────────────────────────────────
 * LAMA (LastMart Automated Market Agent) - The platform's AI-powered assistant.
 *
 * What LAMA does:
 *   1. Studies the entire system (orders, products, vendors, budgets)
 *   2. Reports admin-level issues (low stock, pending vendors, platform health)
 *   3. Provides market/product trends to admin, vendors and customers
 *   4. Tracks recurring purchases for customers
 *   5. Recommends products/vendors within budget
 *   6. Notifies admins and users of trending/upcoming products
 *
 * Sections:
 *   - LAMA Insights panel (personalized for role: admin/vendor/customer)
 *   - Market Trends (top products, categories, vendor rankings)
 *   - Budget Recommendations (LAMA suggests products within your budget)
 *   - Admin: Platform Dashboard with quick stats
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  Bot, TrendingUp, Lightbulb, AlertTriangle, RefreshCw, Bell, CheckCircle2,
  Star, Package, Store, ShoppingCart, BarChart3, Loader, Search,
  Wallet, ChevronRight, Play, Users, DollarSign, Activity
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface LamaInsight {
  id: string; type: string; title: string; body: string;
  target_role: string; data: any; is_read: number; created_at: string;
}

interface TrendData {
  topProducts:     any[]; categoryTrends: any[];
  topVendors:      any[]; orderTrend:     any[]; trendInsights: string[];
}

interface RecommendData {
  products: any[]; vendors: any[]; insights: string[]; budget: number; category?: string;
}

interface AdminStats {
  customers: number; active_vendors: number; pending_vendors: number;
  products: number; total_orders: number; pending_orders: number;
  total_revenue: number; today_orders: number;
}

/* ─── Insight type → style mapping ──────────────────────────────────────────── */
const INSIGHT_STYLE: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  admin_alert:   { bg: 'bg-red-50',    border: 'border-red-200',    icon: <AlertTriangle size={16} className="text-red-500" /> },
  market_trend:  { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: <TrendingUp    size={16} className="text-blue-500" /> },
  recommendation:{ bg: 'bg-green-50',  border: 'border-green-200',  icon: <Lightbulb     size={16} className="text-green-500" /> },
  budget_alert:  { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <Wallet        size={16} className="text-yellow-500" /> },
};

const DEFAULT_STYLE = { bg: 'bg-gray-50', border: 'border-gray-200', icon: <Bell size={16} className="text-gray-500" /> };

export default function LamaPage() {
  const { token, user } = useApp();
  const router          = useRouter();

  const [insights,    setInsights]    = useState<LamaInsight[]>([]);
  const [trends,      setTrends]      = useState<TrendData | null>(null);
  const [recommend,   setRecommend]   = useState<RecommendData | null>(null);
  const [adminDash,   setAdminDash]   = useState<{ stats: AdminStats; issues: any[]; recent_insights: LamaInsight[] } | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [running,     setRunning]     = useState(false);
  const [activeTab,   setActiveTab]   = useState<'insights' | 'trends' | 'recommend' | 'admin'>('insights');

  /* Recommendation filter */
  const [budget,     setBudget]     = useState('');
  const [category,   setCategory]   = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  /* ── Fetch LAMA data ─────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    if (!token) { router.push('/auth/login'); return; }
    setLoading(true);
    try {
      const [insRes, trendRes] = await Promise.all([
        fetch('/api/lama/insights', { headers }).then(r => r.json()),
        fetch('/api/lama/trends',   { headers }).then(r => r.json()),
      ]);
      if (insRes.success)   setInsights(insRes.data);
      if (trendRes.success) setTrends(trendRes.data);

      /* Admin-only dashboard */
      if (user?.role === 'admin') {
        const dashRes = await fetch('/api/lama/dashboard', { headers }).then(r => r.json());
        if (dashRes.success) setAdminDash(dashRes.data);
        setActiveTab('admin');
      }
    } catch { toast.error('Failed to load LAMA data'); }
    setLoading(false);
  }, [token, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Fetch recommendations ───────────────────────────────────────────────── */
  const fetchRecommend = async () => {
    const params = new URLSearchParams();
    if (budget)   params.set('budget',   budget);
    if (category) params.set('category', category);
    const res  = await fetch(`/api/lama/recommend?${params}`, { headers });
    const data = await res.json();
    if (data.success) setRecommend(data.data);
    else toast.error(data.error);
  };

  /* ── Mark insight read ───────────────────────────────────────────────────── */
  const markRead = async (id: string) => {
    await fetch(`/api/lama/insights/${id}/read`, { method: 'PUT', headers });
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: 1 } : i));
  };

  /* ── Run full LAMA analysis (admin) ──────────────────────────────────────── */
  const runAnalysis = async () => {
    setRunning(true);
    try {
      const res  = await fetch('/api/lama/run', { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        toast.success(`LAMA analysis complete! ${data.data.inserted} insights generated.`);
        fetchAll();
      } else { toast.error(data.error); }
    } catch { toast.error('Analysis failed'); }
    setRunning(false);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h    = Math.floor(diff / 3_600_000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (!user) return null;

  /* ─── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Bot className="text-orange-500" size={28} /> LAMA AI Agent
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                LastMart Automated Market Agent · Personalized insights for your role
              </p>
            </div>
            {user.role === 'admin' && (
              <button onClick={runAnalysis} disabled={running}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
                {running ? <Loader size={15} className="animate-spin" /> : <Play size={15} />}
                Run Analysis
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { key: 'insights',  label: 'My Insights',      icon: <Bell     size={14} /> },
              { key: 'trends',    label: 'Market Trends',    icon: <TrendingUp size={14} /> },
              { key: 'recommend', label: 'Recommendations',  icon: <Lightbulb  size={14} /> },
              ...(user.role === 'admin' ? [{ key: 'admin', label: 'Admin Dashboard', icon: <BarChart3 size={14} /> }] : []),
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${activeTab === tab.key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                {tab.icon} {tab.label}
                {tab.key === 'insights' && insights.filter(i => !i.is_read).length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                    {insights.filter(i => !i.is_read).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader size={36} className="animate-spin text-orange-500" />
            </div>
          ) : (

            <>
              {/* ════════════════ INSIGHTS TAB ══════════════════════════════════ */}
              {activeTab === 'insights' && (
                <div className="space-y-4">
                  {insights.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                      <Bot size={48} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500">No LAMA insights yet. Check back after your first orders!</p>
                      {user.role === 'admin' && (
                        <button onClick={runAnalysis} className="btn-primary mt-4">
                          Generate First Insights
                        </button>
                      )}
                    </div>
                  ) : (
                    insights.map(insight => {
                      const style = INSIGHT_STYLE[insight.type] || DEFAULT_STYLE;
                      return (
                        <div key={insight.id}
                          className={`rounded-2xl p-5 border-2 transition-all
                            ${style.bg} ${style.border}
                            ${insight.is_read ? 'opacity-70' : 'shadow-sm'}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">{style.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-gray-800 text-sm">{insight.title}</p>
                                <span className="text-xs text-gray-400 shrink-0">{timeAgo(insight.created_at)}</span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{insight.body}</p>
                            </div>
                            {!insight.is_read && (
                              <button onClick={() => markRead(insight.id)}
                                className="shrink-0 p-1 text-gray-400 hover:text-green-600"
                                title="Mark as read">
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ════════════════ TRENDS TAB ════════════════════════════════════ */}
              {activeTab === 'trends' && trends && (
                <div className="space-y-6">

                  {/* LAMA trend narratives */}
                  {trends.trendInsights.length > 0 && (
                    <section className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
                      <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <TrendingUp size={18} /> LAMA's Market Read
                      </h2>
                      <ul className="space-y-2">
                        {trends.trendInsights.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-orange-50">
                            <span className="mt-0.5">•</span> {t}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top products */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-orange-500" /> Top Selling Products
                      </h3>
                      <div className="space-y-3">
                        {trends.topProducts.map((p, i) => (
                          <Link key={p.id} href={`/product/${p.id}`}
                            className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors">
                            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                              {p.images?.[0]
                                ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                              <p className="text-xs text-gray-500">{p.total_sales} sales · {p.store_name}</p>
                            </div>
                            <span className="text-sm font-semibold text-orange-600">{fmt(p.price)}</span>
                          </Link>
                        ))}
                      </div>
                    </section>

                    {/* Category trends */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-orange-500" /> Category Demand
                      </h3>
                      <div className="space-y-3">
                        {(trends.categoryTrends as any[]).map((c: any, i: number) => {
                          const max = (trends.categoryTrends as any[])[0]?.order_count || 1;
                          const pct = Math.round((c.order_count / max) * 100);
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700">{c.icon} {c.name}</span>
                                <span className="text-gray-500 text-xs">{c.order_count} orders</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Top vendors */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Store size={16} className="text-orange-500" /> Top Vendors
                      </h3>
                      <div className="space-y-3">
                        {trends.topVendors.map((v: any, i: number) => (
                          <Link key={v.id} href={`/vendor/${v.id}`}
                            className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{v.store_name}</p>
                              <p className="text-xs text-gray-500">{v.city} · ⭐ {Number(v.rating).toFixed(1)}</p>
                            </div>
                            <span className="text-xs text-gray-500">{v.total_sales} sales</span>
                          </Link>
                        ))}
                      </div>
                    </section>

                    {/* 7-day order trend */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-orange-500" /> 7-Day Order Trend
                      </h3>
                      <div className="space-y-2">
                        {trends.orderTrend.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">No order data for the past 7 days</p>
                        )}
                        {(trends.orderTrend as any[]).map((d: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500 w-20 shrink-0 text-xs">
                              {new Date(d.day).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-orange-400 rounded-full"
                                style={{ width: `${Math.min((d.orders / 10) * 100, 100)}%` }} />
                            </div>
                            <span className="text-gray-700 font-medium w-12 text-right">{d.orders} orders</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {/* ════════════════ RECOMMENDATIONS TAB ══════════════════════════ */}
              {activeTab === 'recommend' && (
                <div className="space-y-6">
                  {/* Budget filter */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Search size={16} className="text-orange-500" /> Find Products Within Your Budget
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="label">Budget (₦)</label>
                        <input type="number" className="input" placeholder="e.g. 15000"
                          value={budget} onChange={e => setBudget(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="label">Category (optional)</label>
                        <input className="input" placeholder="e.g. Electronics"
                          value={category} onChange={e => setCategory(e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <button onClick={fetchRecommend} className="btn-primary px-6 py-2.5">
                          Get Recommendations
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* LAMA insights for results */}
                  {recommend?.insights && recommend.insights.length > 0 && (
                    <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-5 text-white">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb size={16} /> LAMA's Recommendations
                      </h3>
                      <ul className="space-y-1.5">
                        {recommend.insights.map((ins, i) => (
                          <li key={i} className="text-sm text-green-50 flex items-start gap-2">
                            <span className="mt-0.5">✨</span> {ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Product grid */}
                  {recommend?.products && (
                    <section>
                      <h3 className="font-semibold text-gray-800 mb-4">
                        Products within ₦{Number(recommend.budget).toLocaleString()} budget
                      </h3>
                      {recommend.products.length === 0 ? (
                        <p className="text-gray-500 text-sm">No products found matching your criteria.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {recommend.products.map((p: any) => (
                            <Link key={p.id} href={`/product/${p.id}`}
                              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <div className="h-36 bg-gray-100">
                                {p.images?.[0]
                                  ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📦</div>}
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                <p className="text-xs text-gray-500 truncate">{p.store_name}</p>
                                <p className="text-sm font-bold text-orange-600 mt-1">{fmt(p.price)}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Star size={11} fill="currentColor" className="text-yellow-400" />
                                  <span className="text-xs text-gray-500">{Number(p.rating).toFixed(1)}</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Vendor recommendations */}
                  {recommend?.vendors && recommend.vendors.length > 0 && (
                    <section>
                      <h3 className="font-semibold text-gray-800 mb-4">Recommended Vendors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(recommend.vendors as any[]).map((v: any) => (
                          <Link key={v.id} href={`/vendor/${v.id}`}
                            className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold text-lg shrink-0">
                              {v.store_name?.[0] || 'V'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{v.store_name}</p>
                              <p className="text-xs text-gray-500">{v.city} · {v.product_count} products</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Star size={11} fill="currentColor" className="text-yellow-400" />
                                <span className="text-xs text-gray-600">{Number(v.rating).toFixed(1)}</span>
                                <span className="text-xs text-gray-400">· From {fmt(v.min_price)}</span>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* ════════════════ ADMIN DASHBOARD TAB ══════════════════════════ */}
              {activeTab === 'admin' && user.role === 'admin' && adminDash && (
                <div className="space-y-6">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Customers',       value: adminDash.stats.customers,       icon: <Users        size={20} />, color: 'blue'   },
                      { label: 'Active Vendors',  value: adminDash.stats.active_vendors,  icon: <Store        size={20} />, color: 'green'  },
                      { label: 'Total Orders',    value: adminDash.stats.total_orders,    icon: <ShoppingCart size={20} />, color: 'orange' },
                      { label: 'Revenue',         value: fmt(adminDash.stats.total_revenue), icon: <DollarSign size={20} />, color: 'purple' },
                      { label: 'Pending Vendors', value: adminDash.stats.pending_vendors, icon: <AlertTriangle size={20} />, color: 'yellow' },
                      { label: 'Pending Orders',  value: adminDash.stats.pending_orders,  icon: <Activity     size={20} />, color: 'red'    },
                      { label: 'Products',        value: adminDash.stats.products,        icon: <Package      size={20} />, color: 'teal'   },
                      { label: 'Today Orders',    value: adminDash.stats.today_orders,    icon: <TrendingUp   size={20} />, color: 'indigo' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 text-${s.color}-600 flex items-center justify-center mb-3`}>
                          {s.icon}
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Low stock issues */}
                  {adminDash.issues.length > 0 && (
                    <section className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" /> Low Stock Alerts
                      </h3>
                      <div className="space-y-2">
                        {adminDash.issues.map((issue: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <Package size={14} className="text-red-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{issue.name}</p>
                              <p className="text-xs text-gray-500">{issue.store_name}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                              ${issue.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {issue.stock} left
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Recent LAMA insights for admin */}
                  <section className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-4">Recent LAMA Insights</h3>
                    <div className="space-y-3">
                      {adminDash.recent_insights.map(i => {
                        const style = INSIGHT_STYLE[i.type] || DEFAULT_STYLE;
                        return (
                          <div key={i.id} className={`flex items-start gap-2 p-3 rounded-xl ${style.bg} border ${style.border}`}>
                            {style.icon}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{i.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{i.body}</p>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{timeAgo(i.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
