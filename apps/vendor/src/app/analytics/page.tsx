'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp, Store, LogOut, Package, ShoppingBag, DollarSign,
  Settings, Bell, BarChart2, Users, Star, AlertTriangle,
} from 'lucide-react';
import { getStoredToken, clearStoredToken, isVendorAuthenticated } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

const NAV = [
  { href: '/dashboard',  icon: BarChart2,   label: 'Dashboard' },
  { href: '/products',   icon: Package,      label: 'Products' },
  { href: '/orders',     icon: ShoppingBag,  label: 'Orders' },
  { href: '/analytics',  icon: TrendingUp,   label: 'Analytics', active: true },
  { href: '/payouts',    icon: DollarSign,   label: 'Payouts' },
  { href: '/settings',   icon: Settings,     label: 'Settings' },
];

const PERIODS = [
  { label: '7 Days',  value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
];

interface VendorInfo {
  rating: number;
  total_reviews: number;
}

interface AnalyticsData {
  vendor: VendorInfo;
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    pendingOrders: number;
    lowStockProducts: number;
  };
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; total_sales: number; stock: number; price: number; rating: number }>;
  recentOrders: Array<{ id: string; customer_name: string; status: string; total_amount: number; created_at: string }>;
  ordersByStatus: Array<{ status: string; count: number }>;
}

export default function VendorAnalyticsPage() {
  const router   = useRouter();
  const [period, setPeriod]   = useState('30');
  const [data,   setData]     = useState<AnalyticsData | null>(null);
  const [loading,setLoading]  = useState(true);
  const [navOpen,setNavOpen]  = useState(false);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!isVendorAuthenticated()) { router.replace('/auth/login'); return; }
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/vendors/me/analytics?period=${period}`, { headers: hdrs() });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error ?? 'Failed to load analytics');
      }
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );

  const maxRevenue = Math.max(...(data?.monthlyRevenue?.map(d => d.revenue) ?? [1]), 1);
  const avgOrderValue = data && data.stats.totalOrders > 0
    ? data.stats.totalRevenue / data.stats.totalOrders
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
        ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LastMart</p>
            <p className="text-orange-400 text-xs font-medium">Vendor Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${n.active ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-800 pt-3">
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full transition-colors">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Store className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Analytics</h1>
              <p className="text-xs text-gray-500">Track your store performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                    ${period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({length:4}).map((_,i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-3 w-2/3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : data ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Revenue"    value={formatPrice(data.stats.totalRevenue)} icon={DollarSign}   color="bg-orange-500" />
                <StatCard label="Total Orders"     value={data.stats.totalOrders}                icon={ShoppingBag}  color="bg-blue-500"   />
                <StatCard label="Avg Order Value"  value={formatPrice(avgOrderValue)}            icon={TrendingUp}   color="bg-green-500"  />
                <StatCard label="Rating"           value={`${(data.vendor?.rating ?? 0).toFixed(1)} ★`} icon={Star}  color="bg-yellow-500" />
              </div>

              {/* Secondary stats row */}
              {/* <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total Products"      value={data.stats.totalProducts}    icon={Package}        color="bg-purple-500" />
                <StatCard label="Pending Orders"       value={data.stats.pendingOrders}    icon={ShoppingBag}     color="bg-amber-500"  />
                <StatCard label="Low Stock Products"   value={data.stats.lowStockProducts} icon={AlertTriangle}   color="bg-red-500"    />
              </div> */}

              {/* Revenue Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-black text-gray-900 mb-4">Revenue Over Time</h2>
                {data.monthlyRevenue?.length > 0 ? (
                  <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                    {data.monthlyRevenue.map((d, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-8">
                        <div className="w-6 bg-orange-200 rounded-t transition-all hover:bg-orange-400 cursor-pointer"
                          style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 120)}px` }}
                          title={`${d.month}: ${formatPrice(d.revenue)}`} />
                        <span className="text-[10px] text-gray-400 rotate-45 origin-left w-8 whitespace-nowrap">
                          {d.month.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                    No data for this period
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-black text-gray-900 mb-4">Top Products</h2>
                  {data.topProducts?.length > 0 ? (
                    <div className="space-y-3">
                      {data.topProducts.slice(0,5).map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg text-xs font-black flex items-center justify-center">
                              {i+1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-35">{p.name}</p>
                              <p className="text-xs text-gray-500">{p.stock} in stock · {(p.rating ?? 0).toFixed(1)} ★</p>
                            </div>
                          </div>
                          <p className="font-black text-orange-600 text-sm">{formatPrice(p.price)}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500 text-center py-4">No data yet</p>}
                </div>

                {/* Order Distribution */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-black text-gray-900 mb-4">Order Status</h2>
                  {data.ordersByStatus?.length > 0 ? (
                    <div className="space-y-3">
                      {data.ordersByStatus.map((s, i) => {
                        const total = data.ordersByStatus.reduce((a,b) => a + b.count, 0);
                        const pct   = total ? Math.round((s.count / total) * 100) : 0;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 capitalize">{s.status.replace('_',' ')}</span>
                              <span className="font-bold text-gray-900">{s.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-sm text-gray-500 text-center py-4">No data yet</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Analytics Data</h3>
              <p className="text-gray-500 text-sm">Analytics will appear after your first sale.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}