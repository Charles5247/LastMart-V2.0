'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, Bike, DollarSign, TrendingUp, Settings, Bell, LogOut,
  MapPin, Clock, CheckCircle, Navigation, ChevronLeft, ChevronRight,
  Search, Filter, Phone
} from 'lucide-react';
import { getStoredToken, clearStoredToken, isRiderAuthenticated } from '@/lib/auth';
import { formatPrice, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard',   icon: Bike,       label: 'Dashboard' },
  { href: '/deliveries',  icon: Package,    label: 'Deliveries', active: true },
  { href: '/earnings',    icon: DollarSign, label: 'Earnings' },
  { href: '/settings',    icon: Settings,   label: 'Settings' },
];

const STATUS_TABS = ['all', 'pending', 'in_transit', 'delivered', 'cancelled'];

export default function RiderDeliveriesPage() {
  const router = useRouter();
  const [deliveries,  setDeliveries]  = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [statusTab,   setStatusTab]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [navOpen,     setNavOpen]     = useState(false);
  const [selected,    setSelected]    = useState<any>(null);
  const [updating,    setUpdating]    = useState<string | null>(null);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isRiderAuthenticated()) { router.replace('/auth/login'); return; }
    fetchDeliveries();
  }, [page, statusTab, search]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '15',
        ...(statusTab !== 'all' && { status: statusTab }),
        ...(search && { search }),
      });
      const res  = await fetch(`${API_URL}/riders/deliveries?${params}`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        setDeliveries(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      }
    } catch { toast.error('Failed to load deliveries'); }
    finally  { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res  = await fetch(`${API_URL}/riders/deliveries/${id}/status`, {
        method: 'PUT', headers: hdrs(), body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Marked as ${status}`);
        fetchDeliveries();
        setSelected(null);
      } else toast.error(data.message ?? 'Update failed');
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

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
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Bike className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Deliveries</h1>
              <p className="text-xs text-gray-500">Track and manage all your deliveries</p>
            </div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by order number…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map(s => (
                <button key={s} onClick={() => { setStatusTab(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                    ${statusTab === s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : deliveries.length === 0 ? (
              <div className="p-16 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">No Deliveries</h3>
                <p className="text-gray-500 text-sm">Your delivery history will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {deliveries.map(d => (
                  <div key={d.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(d)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-gray-900 text-sm">#{d.order_number}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(d.status)}`}>
                            {d.status?.replace('_',' ')}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm font-medium">{d.customer_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{d.delivery_address}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-green-600">{formatPrice(d.delivery_fee ?? 500)}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(d.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-60 flex items-start justify-end bg-black/40">
          <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="font-black text-gray-900">Order #{selected.order_number}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-600 mb-1">CUSTOMER</p>
                <p className="font-bold text-gray-900">{selected.customer_name}</p>
                {selected.customer_phone && (
                  <a href={`tel:${selected.customer_phone}`} className="flex items-center gap-2 text-green-600 text-sm mt-1 font-semibold">
                    <Phone className="w-4 h-4" />{selected.customer_phone}
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">PICKUP</p>
                    <p className="text-sm text-gray-800">{selected.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">DELIVERY</p>
                    <p className="text-sm text-gray-800">{selected.delivery_address}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <span className="font-bold text-gray-700">Your Earnings</span>
                <span className="font-black text-green-600 text-lg">{formatPrice(selected.delivery_fee ?? 500)}</span>
              </div>
              {selected.status === 'in_transit' && (
                <button onClick={() => updateStatus(selected.id, 'delivered')} disabled={updating === selected.id}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                  <CheckCircle className="w-5 h-5" />
                  {updating === selected.id ? 'Confirming…' : 'Mark as Delivered'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
