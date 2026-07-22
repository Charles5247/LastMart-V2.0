'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bike, Package, DollarSign, TrendingUp, Settings, Bell, LogOut,
  MapPin, Clock, CheckCircle, ArrowRight, Star, Zap, Navigation,
  ToggleLeft, ToggleRight, AlertTriangle, Menu, X, ChevronRight
} from 'lucide-react';
import { getStoredToken, getStoredUser, clearStoredToken, isRiderAuthenticated } from '@/lib/auth';
import { formatPrice, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard',   icon: Bike,        label: 'Dashboard',   active: true },
  { href: '/deliveries',  icon: Package,      label: 'Deliveries' },
  { href: '/earnings',    icon: DollarSign,   label: 'Earnings' },
  { href: '/settings',    icon: Settings,     label: 'Settings' },
];

export default function RiderDashboard() {
  const router  = useRouter();
  const [user,       setUser]       = useState<any>(null);
  const [stats,      setStats]      = useState<any>(null);
  const [pending,    setPending]    = useState<any[]>([]);
  const [active,     setActive]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [navOpen,    setNavOpen]    = useState(false);
  const [available,  setAvailable]  = useState(true);
  const [toggling,   setToggling]   = useState(false);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isRiderAuthenticated()) { router.replace('/auth/login'); return; }
    const u = getStoredUser();
    setUser(u);
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/riders/stats`,            { headers: hdrs() }),
        fetch(`${API_URL}/riders/available-orders`, { headers: hdrs() }),
        fetch(`${API_URL}/riders/deliveries?status=in_transit`, { headers: hdrs() }),
      ]);
      const [statsData, pendingData, activeData] = await Promise.all([
        statsRes.json(), pendingRes.json(), activeRes.json(),
      ]);
      console.log('Dashboard Data:', { statsData, pendingData, activeData });
      if (statsData.success)   {
        setStats(statsData.data);
        console.log(stats);
        console.log("stats");
      }
      if (pendingData.success) setPending(pendingData.data ?? []);
      if (activeData.success)  setActive(activeData.data ?? []);
    } catch { toast.error('Failed to load dashboard'); }
    finally  { 
      setLoading(false);
      console.log(stats)
     }
  };

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const res  = await fetch(`${API_URL}/riders/availability`, {
        method: 'PUT', headers: hdrs(),
        body: JSON.stringify({ is_available: !available }),
      });
      const data = await res.json();
      if (data.success) {
        setAvailable(!available);
        toast.success(available ? 'You are now offline' : 'You are now online!');
      }
    } catch { toast.error('Failed to update availability'); }
    finally { setToggling(false); }
  };

  const acceptDelivery = async (orderId: string) => {
    try {
      const res  = await fetch(`${API_URL}/riders/accept-delivery`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Delivery accepted!'); fetchDashboard(); }
      else toast.error(data.message ?? 'Failed to accept delivery');
    } catch { toast.error('Failed to accept delivery'); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const STAT_CARDS = [
    { label: 'Today\'s Earnings', value: formatPrice(stats?.today_earnings ?? 0), icon: DollarSign, color: 'bg-green-500' },
    { label: 'Deliveries Today',  value: stats?.today_deliveries ?? 0,             icon: Package,   color: 'bg-blue-500'  },
    { label: 'Rating',            value: `${(stats?.rating ?? 0).toFixed(1)} ★`,   icon: Star,      color: 'bg-yellow-500'},
    { label: 'Total Earnings',    value: formatPrice(stats?.total_earnings ?? 0),  icon: TrendingUp, color: 'bg-purple-500'},
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
        ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LastMart</p>
            <p className="text-green-400 text-xs font-medium">Rider Portal</p>
          </div>
        </div>

        {/* Availability toggle in sidebar */}
        <div className="px-4 py-3 border-b border-gray-800">
          <button onClick={toggleAvailability} disabled={toggling}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-semibold text-sm
              ${available ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
            <span>{available ? '🟢 Online' : '⚫ Offline'}</span>
            {available ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          </button>
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
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-gray-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
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
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
              <p className="text-xs text-gray-500">Welcome back, {user?.name?.split(' ')[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleAvailability} disabled={toggling}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors
                ${available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {available ? <><ToggleRight className="w-5 h-5" />Online</> : <><ToggleLeft className="w-5 h-5" />Offline</>}
            </button>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded mb-3 w-2/3" /><div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_CARDS.map((c, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-500">{c.label}</p>
                      <div className={`p-2 rounded-lg ${c.color}`}><c.icon className="w-4 h-4 text-white" /></div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Active Delivery */}
              {active.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-5 h-5 text-green-600" />
                    <h2 className="font-black text-green-800">Active Delivery</h2>
                    <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                  </div>
                  {active.map(d => (
                    <div key={d.id} className="bg-white rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-black text-gray-900 text-sm">#{d.order_number}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{d.customer_name}</p>
                        </div>
                        <Link href="/deliveries"
                          className="flex items-center gap-1 text-green-600 text-sm font-bold hover:text-green-700">
                          Details <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{d.delivery_address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Orders */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-black text-gray-900">Available Orders</h2>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {stats.pending_assignments.length} nearby
                  </span>
                </div>
                {pending.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bike className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-700">No available orders</p>
                    <p className="text-sm text-gray-500">Stay online to receive new delivery requests</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pending.map(o => (
                      <div key={o.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-gray-900 text-sm">#{o.order_number}</p>
                              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {formatPrice(o.delivery_fee ?? 500)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-green-500" />
                              <span className="truncate">Pickup: {o.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <MapPin className="w-3.5 h-3.5 text-red-500" />
                              <span className="truncate">Deliver: {o.delivery_address}</span>
                            </div>
                          </div>
                          <button onClick={() => acceptDelivery(o.id)}
                            className="shrink-0 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Link href="/deliveries" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><Package className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">My Deliveries</p>
                      <p className="text-xs text-gray-500">View all delivery history</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link href="/earnings" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-50 rounded-xl"><DollarSign className="w-5 h-5 text-green-600" /></div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Earnings</p>
                      <p className="text-xs text-gray-500">Track your income</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
