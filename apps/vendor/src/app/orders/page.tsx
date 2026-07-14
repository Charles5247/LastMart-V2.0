'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag, Search, Filter, Eye, Package, Store, LogOut,
  BarChart2, DollarSign, TrendingUp, Settings, Bell, ChevronLeft,
  ChevronRight, Clock, CheckCircle, XCircle, Truck, RefreshCw
} from 'lucide-react';
import { getStoredToken, clearStoredToken, isVendorAuthenticated } from '@/lib/auth';
import { formatPrice, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard',  icon: BarChart2,   label: 'Dashboard' },
  { href: '/products',   icon: Package,      label: 'Products' },
  { href: '/orders',     icon: ShoppingBag,  label: 'Orders', active: true },
  { href: '/analytics',  icon: TrendingUp,   label: 'Analytics' },
  { href: '/payouts',    icon: DollarSign,   label: 'Payouts' },
  { href: '/settings',   icon: Settings,     label: 'Settings' },
];

const STATUS_TABS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  items: Array<{ product_name: string; quantity: number; price: number }>;
  total: number;
  status: string;
  created_at: string;
  delivery_address?: string;
}

const STATUS_ICONS: Record<string, React.FC<any>> = {
  pending:    Clock,
  confirmed:  CheckCircle,
  preparing:  RefreshCw,
  ready:      Package,
  picked_up:  Truck,
  delivered:  CheckCircle,
  cancelled:  XCircle,
};

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusTab,   setStatusTab]   = useState('all');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [navOpen,     setNavOpen]     = useState(false);
  const [selected,    setSelected]    = useState<Order | null>(null);
  const [updating,    setUpdating]    = useState<string | null>(null);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isVendorAuthenticated()) { router.replace('/auth/login'); return; }
    fetchOrders();
  }, [page, search, statusTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '15',
        ...(search   && { search }),
        ...(statusTab !== 'all' && { status: statusTab }),
      });
      const res  = await fetch(`${API_URL}/orders?${params}`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      }
    } catch { toast.error('Failed to load orders'); }
    finally  { setLoading(false); }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res  = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT', headers: hdrs(), body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order marked as ${newStatus}`);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      } else { toast.error(data.message ?? 'Update failed'); }
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  };

  const nextStatus = (current: string) => {
    const flow: Record<string, string> = {
      pending:   'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready:     'picked_up',
    };
    return flow[current];
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

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

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Store className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Orders</h1>
              <p className="text-xs text-gray-500">Manage and fulfil customer orders</p>
            </div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by order number or customer…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map(s => (
                <button key={s} onClick={() => { setStatusTab(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                    ${statusTab === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="p-16 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">No Orders Found</h3>
                <p className="text-gray-500 text-sm">Orders will appear here when customers place them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Order', 'Customer', 'Items', 'Total', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(o => {
                      const StatusIcon = STATUS_ICONS[o.status] ?? Clock;
                      const next = nextStatus(o.status);
                      return (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs">#{o.order_number}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{o.customer_name}</p>
                            {o.customer_phone && <p className="text-xs text-gray-500">{o.customer_phone}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{o.items?.length ?? 0} item(s)</td>
                          <td className="px-4 py-3 font-black text-orange-600">{formatPrice(o.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold capitalize
                              ${getStatusColor(o.status)}`}>
                              <StatusIcon className="w-3 h-3" />
                              {o.status.replace('_',' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(o.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSelected(o)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              {next && (
                                <button onClick={() => updateStatus(o.id, next)} disabled={updating === o.id}
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors capitalize disabled:opacity-60">
                                  {updating === o.id ? '…' : next.replace('_',' ')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-60 flex items-start justify-end bg-black/40">
          <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="font-black text-gray-900">Order #{selected.order_number}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-600 mb-1">CUSTOMER</p>
                <p className="font-bold text-gray-900">{selected.customer_name}</p>
                {selected.customer_phone && <p className="text-sm text-gray-600">{selected.customer_phone}</p>}
                {selected.delivery_address && <p className="text-sm text-gray-500 mt-1">{selected.delivery_address}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Items</p>
                <div className="space-y-2">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-orange-600">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <span className="font-bold text-gray-700">Total</span>
                <span className="font-black text-orange-600 text-lg">{formatPrice(selected.total)}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {['confirmed','preparing','ready','picked_up','delivered','cancelled'].map(s => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)} disabled={selected.status === s || updating === selected.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors
                        ${selected.status === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40'}`}>
                      {s.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
