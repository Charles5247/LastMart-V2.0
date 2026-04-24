'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Users, Shield, Ban, CheckCircle, Search, ArrowLeft, Loader, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatPrice } from '@/lib/utils';

export default function AdminCustomersPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSuspended, setFilterSuspended] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') fetchCustomers();
  }, [user, isLoading]);

  const fetchCustomers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterSuspended) params.set('suspended', filterSuspended);
    const res = await fetch(`/api/admin/customers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setCustomers(data.data);
    setLoading(false);
  };

  const handleAction = async (userId: string, action: string) => {
    if (action === 'suspend' && !suspendReason) {
      toast.error('Please provide a suspension reason'); return;
    }
    setProcessing(userId);
    try {
      const res = await fetch(`/api/admin/customers/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, suspension_reason: suspendReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Customer ${action}ed`);
        setConfirmAction(null);
        setSuspendReason('');
        fetchCustomers();
      } else {
        toast.error(data.error);
      }
    } catch { toast.error('Network error'); }
    setProcessing(null);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><Loader className="w-10 h-10 text-orange-500 animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-500" />
            <h1 className="text-2xl font-black text-gray-900">Customer Management</h1>
          </div>
          <span className="ml-auto text-sm text-gray-400">{customers.length} customers</span>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
              placeholder="Search by name, email, phone..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 bg-white" />
          </div>
          {['', '0', '1'].map(s => (
            <button key={s} onClick={() => { setFilterSuspended(s); fetchCustomers(); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterSuspended === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {s === '' ? 'All' : s === '0' ? '✅ Active' : '⛔ Suspended'}
            </button>
          ))}
          <button onClick={fetchCustomers} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium">Search</button>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Customer', 'KYC', 'Orders', 'Spent', 'Joined', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No customers found</td></tr>
                ) : customers.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 ${c.is_suspended ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        c.kyc_status === 'approved' ? 'bg-green-100 text-green-700' :
                        c.kyc_status === 'not_submitted' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {c.kyc_status || 'not submitted'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.total_orders}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatPrice(c.total_spent)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      {c.is_suspended ? (
                        <div>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">Suspended</span>
                          {c.suspension_reason && <p className="text-xs text-gray-400 mt-1 max-w-32 truncate">{c.suspension_reason}</p>}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.is_suspended ? (
                          <button onClick={() => handleAction(c.id, 'unsuspend')} disabled={processing === c.id}
                            className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50">
                            <CheckCircle className="w-3 h-3" /> Restore
                          </button>
                        ) : (
                          <button onClick={() => setConfirmAction({ userId: c.id, action: 'suspend' })}
                            className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-200">
                            <Ban className="w-3 h-3" /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Suspend Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900">Suspend Account</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">This will prevent the user from accessing their account. They will be notified.</p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reason for suspension *</label>
              <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g., Fraudulent activity, Policy violation, Chargeback abuse..." rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmAction(null); setSuspendReason(''); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleAction(confirmAction.userId, 'suspend')} disabled={!!processing}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {processing ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
