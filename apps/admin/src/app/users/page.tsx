'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, Store, Bike, ShoppingBag, Activity, Bell, LogOut, Search, ChevronLeft, ChevronRight, UserX, UserCheck } from 'lucide-react';
import { getStoredToken, clearStoredToken, isAdminAuthenticated } from '@/lib/auth';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const NAV = [
  { href: '/dashboard', icon: Activity,    label: 'Dashboard' },
  { href: '/users',     icon: Users,       label: 'Users',   active: true },
  { href: '/vendors',   icon: Store,       label: 'Vendors' },
  { href: '/riders',    icon: Bike,        label: 'Riders' },
  { href: '/orders',    icon: ShoppingBag, label: 'Orders' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [items,      setItems]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [navOpen,    setNavOpen]    = useState(false);
  const [acting,     setActing]     = useState<string | null>(null);

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({
    'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isAdminAuthenticated()) { router.replace('/auth/login'); return; }
    fetchItems();
  }, [page, search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }) });
      const res  = await fetch(`${API_URL}/admin/customers?${params}`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) { setItems(data.data ?? []); setTotalPages(data.pagination?.totalPages ?? 1); }
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const action = async (id: string, act: string) => {
    setActing(id);
    try {
      const res  = await fetch(`${API_URL}/admin/customers/${id}`, { 
        method: 'PUT', 
        headers: hdrs(), 
        body: JSON.stringify({ action: act })
      });
      const data = await res.json();
      if (data.success) { toast.success(`User ${act}d`); fetchItems(); }
      else toast.error(data.message ?? 'Action failed');
    } catch { toast.error('Action failed'); }
    finally { setActing(null); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const formatDate = (s: string) => {
    try { return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s)); }
    catch { return s; }
  };

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
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 w-full">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col max-w-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100"><Shield className="w-5 h-5" /></button>
            <div><h1 className="text-xl font-black text-gray-900">Users</h1><p className="text-xs text-gray-500">Manage platform users</p></div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : items.length === 0 ? (
              <div className="p-16 text-center"><Users className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No users found</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>{['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-500">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                            ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'vendor' ? 'bg-orange-100 text-orange-700' : u.role === 'rider' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                            ${u.is_suspended != false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {u.is_suspended != false ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          {u.role !== 'admin' && (
                            u.is_suspended == false
                              ? <button onClick={() => action(u.id, 'suspend')} disabled={acting === u.id}
                                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60">
                                  <UserX className="w-3.5 h-3.5" />Suspend
                                </button>
                              : <button onClick={() => action(u.id, 'activate')} disabled={acting === u.id}
                                  className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60">
                                  <UserCheck className="w-3.5 h-3.5" />Activate
                                </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
