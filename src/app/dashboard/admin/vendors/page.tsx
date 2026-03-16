'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Store, Search, CheckCircle, XCircle, Star, ArrowLeft, MapPin, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminVendorsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) { router.push('/'); return; }
    if (user) fetchVendors();
  }, [user, isLoading]);

  const fetchVendors = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (search) params.append('search', search);
    const res = await fetch(`/api/admin/vendors?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setVendors(data.data);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchVendors(); }, [statusFilter, search]);

  const updateVendor = async (vendorId: string, updates: Record<string, any>) => {
    setUpdating(vendorId);
    const res = await fetch('/api/admin/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ vendor_id: vendorId, ...updates }) });
    const data = await res.json();
    if (data.success) { toast.success('Vendor updated!'); fetchVendors(); }
    else toast.error(data.error || 'Failed');
    setUpdating(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/admin" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Vendor Management</h1>
            <p className="text-gray-500 text-sm">{vendors.length} vendors total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2 flex-1 border border-gray-200">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors, stores, cities..." className="flex-1 bg-transparent focus:outline-none text-sm" />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'suspended'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)} ({vendors.filter(v => s === 'all' || v.status === s).length})
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending Review', count: vendors.filter(v => v.status === 'pending').length, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Approved', count: vendors.filter(v => v.status === 'approved').length, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Suspended', count: vendors.filter(v => v.status === 'suspended').length, color: 'bg-red-50 text-red-700 border-red-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
              <p className="text-3xl font-black">{s.count}</p>
              <p className="text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : vendors.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Vendor</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-4">Owner</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-4">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-4">Location</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-4">Rating</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-4">Status</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-4">Featured</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{vendor.store_name.charAt(0)}</div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{vendor.store_name}</p>
                            <p className="text-xs text-gray-400">{formatDate(vendor.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">{vendor.user_name}</p>
                        <p className="text-xs text-gray-400">{vendor.user_email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{vendor.category || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600"><MapPin className="w-3 h-3 text-orange-500" />{vendor.city}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1"><span className="text-yellow-400">⭐</span><span className="text-sm font-medium text-gray-700">{vendor.rating}</span></div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(vendor.status)}`}>{vendor.status}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => updateVendor(vendor.id, { is_featured: vendor.is_featured ? 0 : 1 })} disabled={updating === vendor.id} className="text-gray-400 hover:text-orange-500 transition-colors">
                          {vendor.is_featured ? <ToggleRight className="w-6 h-6 text-orange-500" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/vendor/${vendor.id}`} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors">
                            <Eye className="w-3 h-3" />
                          </Link>
                          {vendor.status === 'pending' && (
                            <button onClick={() => updateVendor(vendor.id, { status: 'approved' })} disabled={updating === vendor.id} className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors">
                              <CheckCircle className="w-3 h-3" />
                            </button>
                          )}
                          {vendor.status === 'approved' && (
                            <button onClick={() => updateVendor(vendor.id, { status: 'suspended' })} disabled={updating === vendor.id} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors">
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}
                          {vendor.status === 'suspended' && (
                            <button onClick={() => updateVendor(vendor.id, { status: 'approved' })} disabled={updating === vendor.id} className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors">
                              <CheckCircle className="w-3 h-3" />
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
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No vendors found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
