'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Bike, ArrowLeft, CheckCircle, XCircle, Clock, Star, MapPin, Phone, Search, Eye, Ban, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminRidersPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeRider, setActiveRider] = useState<any>(null);
  const [actionType, setActionType] = useState<'view' | 'kyc'>('view');

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user) fetchRiders();
  }, [user, isLoading, filter]);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/riders?status=${filter !== 'all' ? filter : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setRiders(data.data || []);
    } catch {}
    setLoading(false);
  };

  const updateKycStatus = async (riderId: string, status: 'approved' | 'rejected', note?: string) => {
    try {
      const res = await fetch(`/api/admin/riders/${riderId}/kyc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kyc_status: status, note }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Rider KYC ${status}`); setActiveRider(null); fetchRiders(); }
      else toast.error(data.message || 'Failed');
    } catch { toast.error('Error updating KYC'); }
  };

  const toggleRiderStatus = async (riderId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/riders/${riderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Rider ${!isActive ? 'activated' : 'suspended'}`); fetchRiders(); }
    } catch { toast.error('Error updating status'); }
  };

  const filteredRiders = riders.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
  );

  const kycBadge = (status: string) => ({
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    none: 'bg-gray-100 text-gray-600',
  }[status] || 'bg-gray-100 text-gray-600');

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/admin" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Bike className="w-6 h-6 text-orange-500" /> Rider Management
            </h1>
            <p className="text-gray-500 text-sm">{riders.filter(r => r.kyc_status === 'pending').length} KYC pending approval</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Riders', count: riders.length, color: 'bg-gray-50 text-gray-700' },
            { label: 'Active', count: riders.filter(r => r.is_active && r.kyc_status === 'approved').length, color: 'bg-green-50 text-green-700' },
            { label: 'KYC Pending', count: riders.filter(r => r.kyc_status === 'pending').length, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Online Now', count: riders.filter(r => r.is_available).length, color: 'bg-orange-50 text-orange-700' },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl p-4 ${s.color}`}>
              <div className="text-2xl font-black">{s.count}</div>
              <div className="text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'active', 'suspended'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Riders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Rider', 'Phone', 'Vehicle', 'KYC Status', 'Deliveries', 'Rating', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRiders.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-gray-800">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.phone}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 capitalize">{r.vehicle_type}</div>
                      <div className="text-xs text-gray-400">{r.vehicle_plate}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${kycBadge(r.kyc_status || 'none')}`}>
                        {(r.kyc_status || 'none').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{r.total_deliveries || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 text-yellow-400" />
                        {(r.rating || 0).toFixed(1)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${r.is_available ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-500">{r.is_available ? 'Online' : 'Offline'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setActiveRider(r); setActionType('view'); }}
                          className="text-orange-500 hover:text-orange-700 text-xs font-semibold flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {r.kyc_status === 'pending' && (
                          <button onClick={() => { setActiveRider(r); setActionType('kyc'); }}
                            className="text-blue-500 hover:text-blue-700 text-xs font-semibold">KYC</button>
                        )}
                        <button onClick={() => toggleRiderStatus(r.id, r.is_active)}
                          className={`text-xs font-semibold ${r.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}>
                          {r.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRiders.length === 0 && <div className="text-center py-12 text-gray-400">No riders found</div>}
          </div>
        </div>

        {/* Rider Detail Modal */}
        {activeRider && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black text-gray-800 mb-5">{activeRider.name}</h3>
              <div className="grid grid-cols-2 gap-3 mb-5 bg-gray-50 rounded-xl p-4 text-sm">
                <div><div className="text-xs text-gray-400">Phone</div><div className="font-semibold">{activeRider.phone}</div></div>
                <div><div className="text-xs text-gray-400">Email</div><div className="font-semibold">{activeRider.email}</div></div>
                <div><div className="text-xs text-gray-400">Vehicle</div><div className="font-semibold capitalize">{activeRider.vehicle_type}</div></div>
                <div><div className="text-xs text-gray-400">Plate</div><div className="font-semibold">{activeRider.vehicle_plate}</div></div>
                <div><div className="text-xs text-gray-400">Deliveries</div><div className="font-semibold">{activeRider.total_deliveries || 0}</div></div>
                <div><div className="text-xs text-gray-400">Rating</div><div className="font-semibold">{(activeRider.rating || 0).toFixed(1)} ⭐</div></div>
              </div>

              {actionType === 'kyc' && activeRider.kyc_status === 'pending' && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-bold text-gray-800 mb-3">KYC Documents</h4>
                  <div className="space-y-2 mb-4">
                    {['gov_id', 'selfie', 'vehicle_reg', 'vehicle_photo'].map(doc => (
                      <div key={doc} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                        <span className="text-sm capitalize text-gray-700">{doc.replace('_', ' ')}</span>
                        {activeRider[`${doc}_url`] ? (
                          <a href={activeRider[`${doc}_url`]} target="_blank" rel="noreferrer" className="text-orange-500 text-xs hover:underline">View →</a>
                        ) : (
                          <span className="text-xs text-gray-400">Not uploaded</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => updateKycStatus(activeRider.id, 'rejected')}
                      className="flex-1 border-2 border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-50">
                      ❌ Reject KYC
                    </button>
                    <button onClick={() => updateKycStatus(activeRider.id, 'approved')}
                      className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600">
                      ✅ Approve KYC
                    </button>
                  </div>
                </div>
              )}

              <button onClick={() => setActiveRider(null)}
                className="w-full mt-4 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
