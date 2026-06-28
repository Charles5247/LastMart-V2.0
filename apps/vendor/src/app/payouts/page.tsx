'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign, Store, LogOut, Package, ShoppingBag, TrendingUp,
  Settings, Bell, BarChart2, ArrowDownToLine, Clock, CheckCircle,
  XCircle, AlertTriangle, ChevronLeft, ChevronRight, CreditCard
} from 'lucide-react';
import { getStoredToken, clearStoredToken, isVendorAuthenticated } from '@/lib/auth';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard',  icon: BarChart2,   label: 'Dashboard' },
  { href: '/products',   icon: Package,      label: 'Products' },
  { href: '/orders',     icon: ShoppingBag,  label: 'Orders' },
  { href: '/analytics',  icon: TrendingUp,   label: 'Analytics' },
  { href: '/payouts',    icon: DollarSign,   label: 'Payouts', active: true },
  { href: '/settings',   icon: Settings,     label: 'Settings' },
];

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bank_name?: string;
  account_number?: string;
  created_at: string;
  paid_at?: string;
  reference?: string;
}

interface PayoutSummary {
  available_balance: number;
  pending_payout: number;
  total_paid: number;
  next_payout_date?: string;
}

export default function VendorPayoutsPage() {
  const router  = useRouter();
  const [summary,   setSummary]   = useState<PayoutSummary | null>(null);
  const [payouts,   setPayouts]   = useState<Payout[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [totalPages,setTotalPages] = useState(1);
  const [navOpen,   setNavOpen]   = useState(false);
  const [requesting,setRequesting] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmt,  setWithdrawAmt]  = useState('');

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isVendorAuthenticated()) { router.replace('/auth/login'); return; }
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, payRes] = await Promise.all([
        fetch(`${API}/vendors/payout-summary`, { headers: hdrs() }),
        fetch(`${API}/vendors/payouts?page=${page}&limit=10`, { headers: hdrs() }),
      ]);
      const [sumData, payData] = await Promise.all([sumRes.json(), payRes.json()]);
      if (sumData.success) setSummary(sumData.data);
      if (payData.success) {
        setPayouts(payData.data ?? []);
        setTotalPages(payData.pagination?.totalPages ?? 1);
      }
    } catch { toast.error('Failed to load payout data'); }
    finally { setLoading(false); }
  };

  const requestWithdraw = async () => {
    const amount = Number(withdrawAmt);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (summary && amount > summary.available_balance) { toast.error('Insufficient balance'); return; }
    setRequesting(true);
    try {
      const res  = await fetch(`${API}/vendors/request-payout`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Withdrawal request submitted!');
        setShowWithdraw(false);
        setWithdrawAmt('');
        fetchData();
      } else { toast.error(data.message ?? 'Request failed'); }
    } catch { toast.error('Request failed'); }
    finally { setRequesting(false); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const statusIcon = (s: string) => ({
    pending:    <Clock    className="w-4 h-4 text-yellow-500" />,
    processing: <Clock    className="w-4 h-4 text-blue-500"   />,
    completed:  <CheckCircle className="w-4 h-4 text-green-500" />,
    failed:     <XCircle  className="w-4 h-4 text-red-500"   />,
  }[s] ?? null);

  const statusColor = (s: string) => ({
    pending:    'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed:  'bg-green-100 text-green-700',
    failed:     'bg-red-100 text-red-700',
  }[s] ?? 'bg-gray-100 text-gray-700');

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
              <h1 className="text-xl font-black text-gray-900">Payouts</h1>
              <p className="text-xs text-gray-500">Manage your earnings and withdrawals</p>
            </div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Balance Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            {loading ? Array.from({length:3}).map((_,i)=>(
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-3 bg-gray-200 rounded mb-3 w-2/3" /><div className="h-7 bg-gray-200 rounded w-1/2" />
              </div>
            )) : (
              <>
                <div className="bg-orange-500 rounded-xl p-5 text-white">
                  <p className="text-sm font-medium opacity-80 mb-1">Available Balance</p>
                  <p className="text-3xl font-black">{formatPrice(summary?.available_balance ?? 0)}</p>
                  <button onClick={() => setShowWithdraw(true)}
                    className="mt-3 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
                    <ArrowDownToLine className="w-4 h-4" />Withdraw
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm font-medium text-gray-500 mb-1">Pending Payout</p>
                  <p className="text-3xl font-black text-gray-900">{formatPrice(summary?.pending_payout ?? 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">Being processed</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Paid Out</p>
                  <p className="text-3xl font-black text-gray-900">{formatPrice(summary?.total_paid ?? 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">All time earnings</p>
                </div>
              </>
            )}
          </div>

          {/* Payout History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-black text-gray-900">Payout History</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : payouts.length === 0 ? (
              <div className="p-16 text-center">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">No Payouts Yet</h3>
                <p className="text-gray-500 text-sm">Your payout history will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Reference', 'Amount', 'Bank', 'Status', 'Requested', 'Paid At'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference ?? '—'}</td>
                        <td className="px-4 py-3 font-black text-orange-600">{formatPrice(p.amount)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-xs">{p.bank_name ?? '—'}</p>
                          {p.account_number && <p className="text-xs text-gray-400">{p.account_number}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(p.status)}`}>
                            {statusIcon(p.status)}{p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
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
        </main>
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-black text-gray-900 mb-1">Request Withdrawal</h2>
            <p className="text-sm text-gray-500 mb-4">Available: <b className="text-orange-600">{formatPrice(summary?.available_balance ?? 0)}</b></p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₦)</label>
              <input type="number" min="100" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Enter amount" />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">Payouts are processed within 1–3 business days to your registered bank account.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowWithdraw(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={requestWithdraw} disabled={requesting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-60">
                {requesting ? 'Submitting…' : 'Request Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
