'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Users, Store, Bike, ShoppingBag, DollarSign, TrendingUp,
  Bell, LogOut, CheckCircle, XCircle, Clock, AlertTriangle,
  Menu, ArrowRight, Package, Activity
} from 'lucide-react';
import { getStoredToken, getStoredUser, clearStoredToken, isAdminAuthenticated } from '@/lib/auth';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';
import { DashboardStats } from '@/types';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard', icon: Activity,    label: 'Dashboard', active: true },
  { href: '/users',     icon: Users,       label: 'Users' },
  { href: '/vendors',   icon: Store,       label: 'Vendors' },
  { href: '/riders',    icon: Bike,        label: 'Riders' },
  { href: '/orders',    icon: ShoppingBag, label: 'Orders' },
];

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',minimumFractionDigits:0}).format(n);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user,    setUser]    = useState<any>(null);
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!isAdminAuthenticated()) { router.replace('/auth/login'); return; }
    setUser(getStoredUser());
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingVendors, pendingRiders] = await Promise.all([
        fetch(`${API_URL}/admin/analytics`,           { headers: hdrs() }),
        fetch(`${API_URL}/admin/vendors?status=pending&limit=5`, { headers: hdrs() }),
        fetch(`${API_URL}/admin/riders?status=pending&limit=5`,  { headers: hdrs() }),
      ]);
      const [s, v, r] = await Promise.all([statsRes.json(), pendingVendors.json(), pendingRiders.json()]);
      if (s.success) {
        setStats({
          total_users: s.data.stats.totalUsers ?? 0,
          active_vendors: s.data.stats.activeVendors ?? 0,
          active_riders: s.data.stats.activeRiders ?? 0,
          total_orders: s.data.stats.totalOrders ?? 0,
          total_revenue: s.data.stats.totalRevenue ?? 0,
          pending_approvals: s.data.stats.pendingApprovals ?? 0
        });
      }
      const pv = v.success ? (v.data ?? []).map((x: any) => ({ ...x, type: 'vendor' })) : [];
      const pr = r.success ? (r.data ?? []).map((x: any) => ({ ...x, type: 'rider'  })) : [];
      setPending([...pv, ...pr].slice(0, 8));
    } catch { toast.error('Failed to load dashboard'); }
    finally  { setLoading(false); }
  };

  const approve = async (id: string, type: string) => {
    try {
      const endpoint = type === 'vendor' ? `/admin/vendors/${id}/approve` : `/admin/riders/${id}/approve`;
      const res  = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: hdrs() });
      const data = await res.json();
      if (data.success) { toast.success(`${type} approved`); fetchDashboard(); }
      else toast.error(data.message ?? 'Failed');
    } catch { toast.error('Failed'); }
  };

  const reject = async (id: string, type: string) => {
    try {
      const endpoint = type === 'vendor' ? `/admin/vendors/${id}/reject` : `/admin/riders/${id}/reject`;
      const res  = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: hdrs() });
      const data = await res.json();
      if (data.success) { toast.success(`${type} rejected`); fetchDashboard(); }
    } catch { toast.error('Failed'); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const STAT_CARDS = [
    { label: 'Total Users',    value: stats?.total_users    ?? 0, icon: Users,       color: 'bg-blue-500'   },
    { label: 'Active Vendors', value: stats?.active_vendors ?? 0, icon: Store,       color: 'bg-orange-500' },
    { label: 'Active Riders',  value: stats?.active_riders  ?? 0, icon: Bike,        color: 'bg-green-500'  },
    { label: 'Total Orders',   value: stats?.total_orders   ?? 0, icon: ShoppingBag, color: 'bg-purple-500' },
    { label: 'Revenue',        value: formatPrice(stats?.total_revenue ?? 0), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Pending',        value: stats?.pending_approvals ?? 0, icon: Clock,    color: 'bg-yellow-500' },
  ];

  // console.log('stats', stats);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
        ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
          <div><p className="text-white font-bold text-sm">LastMart</p><p className="text-red-400 text-xs font-medium">Admin Portal</p></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${n.active ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-800 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100"><Menu className="w-5 h-5" /></button>
            <div><h1 className="text-xl font-black text-gray-900">Admin Dashboard</h1><p className="text-xs text-gray-500">Platform overview & approvals</p></div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading ? Array.from({length:6}).map((_,i)=>(
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-3 bg-gray-200 rounded mb-2 w-2/3" /><div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            )) : STAT_CARDS.map((c,i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 leading-tight">{c.label}</p>
                  <div className={`p-1.5 rounded-lg ${c.color}`}><c.icon className="w-3.5 h-3.5 text-white" /></div>
                </div>
                <p className="text-xl font-black text-gray-900">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h2 className="font-black text-gray-900">Pending Approvals</h2>
              </div>
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">{pending.length}</span>
            </div>
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : pending.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-14 h-14 text-green-300 mx-auto mb-3" />
                <p className="font-bold text-gray-700">All caught up!</p>
                <p className="text-sm text-gray-500">No pending approvals at this time.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pending.map((p: any) => (
                  <div key={`${p.type}-${p.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.type === 'vendor' ? 'bg-orange-100' : 'bg-green-100'}`}>
                        {p.type === 'vendor' ? <Store className="w-4 h-4 text-orange-600" /> : <Bike className="w-4 h-4 text-green-600" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{p.store_name ?? p.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.type} · {p.city ?? p.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approve(p.id, p.type)}
                        className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" />Approve
                      </button>
                      <button onClick={() => reject(p.id, p.type)}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/users',   label: 'Manage Users',   icon: Users,       color: 'bg-blue-50',   text: 'text-blue-600'   },
              { href: '/vendors', label: 'Manage Vendors', icon: Store,       color: 'bg-orange-50', text: 'text-orange-600' },
              { href: '/riders',  label: 'Manage Riders',  icon: Bike,        color: 'bg-green-50',  text: 'text-green-600'  },
              { href: '/orders',  label: 'View Orders',    icon: ShoppingBag, color: 'bg-purple-50', text: 'text-purple-600' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 ${l.color} rounded-xl`}><l.icon className={`w-5 h-5 ${l.text}`} /></div>
                  <p className="font-bold text-gray-900 text-sm">{l.label}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
