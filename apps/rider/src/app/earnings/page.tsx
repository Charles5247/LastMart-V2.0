'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign, Bike, Package, TrendingUp, Settings, Bell, LogOut,
  ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Wallet
} from 'lucide-react';
import { getStoredToken, clearStoredToken, isRiderAuthenticated } from '@/lib/auth';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard',  icon: Bike,       label: 'Dashboard' },
  { href: '/deliveries', icon: Package,    label: 'Deliveries' },
  { href: '/earnings',   icon: DollarSign, label: 'Earnings', active: true },
  { href: '/settings',   icon: Settings,   label: 'Settings' },
];

const PERIODS = [{ label: '7D', value: '7' }, { label: '30D', value: '30' }, { label: '90D', value: '90' }];

export default function RiderEarningsPage() {
  const router  = useRouter();
  const [summary,  setSummary]  = useState<any>(null);
  const [history,  setHistory]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [period,   setPeriod]   = useState('30');
  const [page,     setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [navOpen,  setNavOpen]  = useState(false);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!isRiderAuthenticated()) { router.replace('/auth/login'); return; }
    fetchEarnings();
  }, [period, page]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const [sumRes, histRes] = await Promise.all([
        fetch(`${API_URL}/riders/earnings?period=${period}`,     { headers: hdrs() }),
        fetch(`${API_URL}/riders/earnings/history?page=${page}`, { headers: hdrs() }),
      ]);
      const [sumData, histData] = await Promise.all([sumRes.json(), histRes.json()]);
      if (sumData.success)  setSummary(sumData.data);
      if (histData.success) { setHistory(histData.data ?? []); setTotalPages(histData.pagination?.totalPages ?? 1); }
    } catch { toast.error('Failed to load earnings'); }
    finally { setLoading(false); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const maxBar = Math.max(...(summary?.chart?.map((d: any) => d.amount) ?? [1]));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
        ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">LastMart</p>
            <p className="text-green-400 text-xs font-medium">Rider Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${n.active ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-800 pt-3">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Bike className="size-4 md:size-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Earnings</h1>
              <p className="text-xs text-gray-500">Track your income and payouts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`px-1.5 py-1.5 md:px-3 rounded-md text-xs font-semibold transition-colors
                    ${period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <Bell className="size-4 md:size-5 text-gray-400" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="grid sm:grid-cols-4 gap-4">
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded mb-3 w-2/3" /><div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'This Period',    value: formatPrice(summary?.period_earnings ?? 0),  color: 'bg-green-500' },
                  { label: 'Total Earned',   value: formatPrice(summary?.total_earnings   ?? 0), color: 'bg-blue-500'  },
                  { label: 'Deliveries',     value: summary?.total_deliveries ?? 0,              color: 'bg-purple-500'},
                  { label: 'Avg per Trip',   value: formatPrice(summary?.avg_per_trip ?? 0),    color: 'bg-orange-500'},
                ].map((c,i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">{c.label}</p>
                    <p className="text-xl font-black text-gray-900">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {summary?.chart?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-black text-gray-900 mb-4">Daily Earnings</h2>
                  <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                    {summary.chart.map((d: any, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-7">
                        <div className="w-5 bg-green-200 hover:bg-green-400 rounded-t transition-all cursor-pointer"
                          style={{ height: `${Math.max(4, (d.amount / maxBar) * 100)}px` }}
                          title={`${d.date}: ${formatPrice(d.amount)}`} />
                        <span className="text-[10px] text-gray-400">{d.date?.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="font-black text-gray-900">Earnings History</h2>
                </div>
                {history.length === 0 ? (
                  <div className="p-16 text-center">
                    <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-700">No earnings yet</p>
                    <p className="text-sm text-gray-500">Complete deliveries to start earning</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Order', 'Customer', 'Delivery Fee', 'Date'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.map((h: any) => (
                          <tr key={h.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">#{h.order_number}</td>
                            <td className="px-4 py-3 text-gray-700">{h.customer_name}</td>
                            <td className="px-4 py-3 font-black text-green-600">{formatPrice(h.delivery_fee ?? 500)}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(h.delivered_at ?? h.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
