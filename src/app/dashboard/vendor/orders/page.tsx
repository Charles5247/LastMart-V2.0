'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { ShoppingBag, ArrowLeft, Clock, CheckCircle, Truck, XCircle, Package, Bell } from 'lucide-react';
import { formatPrice, getStatusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function VendorOrdersPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) { router.push('/auth/login'); return; }
    if (user) fetchOrders();
  }, [user, isLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetch('/api/orders?limit=100', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setOrders(data.data);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    const res = await fetch(`/api/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.success) { toast.success(`Order ${status}!`); fetchOrders(); }
    else toast.error(data.error || 'Failed');
    setUpdatingId(null);
  };

  const notifyReady = async (orderId: string, readyType: 'pickup' | 'delivery') => {
    setUpdatingId(orderId + readyType);
    try {
      const res = await fetch('/api/ranking/notify-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: orderId, ready_type: readyType })
      });
      const data = await res.json();
      if (data.success) toast.success(`Customer notified: order ready for ${readyType}!`);
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    setUpdatingId(null);
    fetchOrders();
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const statusFilters = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const nextStatus: Record<string, string> = { pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered' };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/vendor" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Order Management</h1>
            <p className="text-gray-500 text-sm">{orders.length} total orders</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {statusFilters.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-orange-500 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${orders.filter(o => o.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', count: orders.filter(o=>o.status==='pending').length, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Processing', count: orders.filter(o=>o.status==='processing'||o.status==='confirmed').length, icon: Package, color: 'text-blue-600 bg-blue-50' },
            { label: 'Shipped', count: orders.filter(o=>o.status==='shipped').length, icon: Truck, color: 'text-purple-600 bg-purple-50' },
            { label: 'Delivered', count: orders.filter(o=>o.status==='delivered').length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xl font-black text-gray-800">{s.count}</p><p className="text-xs text-gray-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map(order => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-gray-800">#{order.id.slice(-8).toUpperCase()}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-gray-500">Customer: <span className="font-medium text-gray-700">{order.customer_name}</span></p>
                    <p className="text-sm text-gray-500">Delivery: <span className="font-medium text-gray-700">{order.delivery_address}, {order.delivery_city}</span></p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-orange-600">{formatPrice(order.total_amount)}</p>
                    <p className="text-xs text-gray-500">Delivery: {formatPrice(order.delivery_fee)}</p>
                    <p className="text-xs text-gray-400 mt-1">{order.payment_method} · {order.payment_status}</p>
                  </div>
                </div>

                {/* Items */}
                {order.items?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs">
                        <img src={item.product_image || `https://picsum.photos/seed/${item.product_id}/40/40`} alt={item.product_name} className="w-7 h-7 rounded-lg object-cover" />
                        <span className="text-gray-700">{item.product_name}</span>
                        <span className="text-gray-500">×{item.quantity}</span>
                        <span className="font-bold text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {nextStatus[order.status] && (
                  <div className="flex gap-3 pt-3 border-t border-gray-100 flex-wrap">
                    <button
                      onClick={() => updateStatus(order.id, nextStatus[order.status])}
                      disabled={updatingId === order.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {updatingId === order.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                      Mark as {nextStatus[order.status].charAt(0).toUpperCase() + nextStatus[order.status].slice(1)}
                    </button>
                    {/* Notify Ready buttons */}
                    {(order.status === 'processing' || order.status === 'confirmed') && !order.vendor_ready_notified && (
                      <>
                        {order.delivery_mode === 'pickup' ? (
                          <button onClick={() => notifyReady(order.id, 'pickup')} disabled={updatingId === order.id + 'pickup'}
                            className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-200 disabled:opacity-50">
                            <Bell className="w-4 h-4" /> Notify: Ready for Pickup
                          </button>
                        ) : (
                          <button onClick={() => notifyReady(order.id, 'delivery')} disabled={updatingId === order.id + 'delivery'}
                            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-200 disabled:opacity-50">
                            <Bell className="w-4 h-4" /> Notify: Ready for Delivery
                          </button>
                        )}
                      </>
                    )}
                    {order.vendor_ready_notified ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-3 py-2 bg-green-50 rounded-xl">
                        <CheckCircle className="w-4 h-4" /> Customer Notified
                      </span>
                    ) : null}
                    {order.status === 'pending' && (
                      <button onClick={() => updateStatus(order.id, 'cancelled')} disabled={updatingId === order.id} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-red-100">
                        <XCircle className="w-4 h-4" /> Cancel
                      </button>
                    )}
                  </div>
                )}
                {order.status === 'delivered' && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-sm text-green-600 font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Order delivered successfully</span>
                  </div>
                )}
              </div>
            ))}
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
