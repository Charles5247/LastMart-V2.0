'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { ShoppingBag, ArrowLeft, Search, Filter } from 'lucide-react';
import { formatPrice, getStatusColor, formatDate } from '@/lib/utils';

export default function AdminOrdersPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) { router.push('/'); return; }
    if (user) fetchOrders();
  }, [user, isLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter !== 'all') params.append('status', statusFilter);
    const res = await fetch(`/api/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setOrders(data.data);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchOrders(); }, [statusFilter]);

  const filtered = orders.filter(o => !search || o.id.includes(search) || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.vendor_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/admin" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Order Monitor</h1>
            <p className="text-gray-500 text-sm">{orders.length} orders total</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`p-3 rounded-xl text-center transition-all border ${statusFilter === s ? 'bg-orange-500 text-white border-orange-500 shadow' : 'bg-white border-gray-100 hover:border-orange-200'}`}>
              <p className="text-xl font-black">{s === 'all' ? orders.length : orders.filter(o => o.status === s).length}</p>
              <p className="text-xs font-medium capitalize mt-0.5">{s}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID, customer, or vendor..." className="flex-1 focus:outline-none text-sm text-gray-700" />
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Order ID', 'Customer', 'Vendor', 'Items', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-800">#{order.id.slice(-8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{order.delivery_city}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{order.vendor_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{order.items?.length || 0} item(s)</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-800">{formatPrice(order.total_amount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${order.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.payment_status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No orders found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
