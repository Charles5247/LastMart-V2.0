'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Package, Truck, CheckCircle, Clock, X, ChevronRight, ArrowLeft, Star } from 'lucide-react';
import { formatPrice, getStatusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState<{ orderId: string; vendorId: string } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchOrders();
  }, [user, isLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetch('/api/orders?limit=50', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setOrders(data.data);
    setLoading(false);
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const submitReview = async () => {
    if (!reviewModal) return;
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ vendor_id: reviewModal.vendorId, order_id: reviewModal.orderId, ...reviewForm }) });
    const data = await res.json();
    if (data.success) { toast.success('Review submitted!'); setReviewModal(null); }
    else toast.error(data.error);
  };

  const statusFilters = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/customer" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">My Orders</h1>
            <p className="text-gray-500 text-sm">{orders.length} total orders</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {statusFilters.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${orders.filter(o => o.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map(order => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-black text-gray-800">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{order.vendor_name} · {formatDate(order.created_at)}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>{order.status.toUpperCase()}</span>
                </div>

                {order.items?.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mb-4">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                        <img src={item.product_image || `https://picsum.photos/seed/${item.product_id}/60/60`} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">{item.product_name}</span>
                        <span className="text-xs text-gray-500">×{item.quantity}</span>
                        <span className="text-sm font-bold text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-lg font-black text-orange-600">{formatPrice(order.total_amount)}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> Delivery: {order.estimated_delivery ? formatDate(order.estimated_delivery) : '48hrs from order'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedOrder(order === selectedOrder ? null : order)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100">
                      {selectedOrder?.id === order.id ? 'Hide' : 'Track'}
                    </button>
                    {order.status === 'delivered' && (
                      <button onClick={() => setReviewModal({ orderId: order.id, vendorId: order.vendor_id })} className="text-xs bg-yellow-50 text-yellow-600 px-3 py-1.5 rounded-lg font-medium hover:bg-yellow-100 flex items-center gap-1">
                        <Star className="w-3 h-3" /> Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking Timeline */}
                {selectedOrder?.id === order.id && order.tracking_updates?.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Tracking Timeline</p>
                    <div className="space-y-3">
                      {order.tracking_updates.map((update: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${i === order.tracking_updates.length - 1 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{update.message}</p>
                            <p className="text-xs text-gray-400">{new Date(update.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
            <Link href="/marketplace" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium inline-block">Start Shopping</Link>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-black text-gray-800 mb-6">Leave a Review</h3>
            <div className="flex gap-2 mb-4 justify-center">
              {[1,2,3,4,5].map(r => (
                <button key={r} onClick={() => setReviewForm(f => ({ ...f, rating: r }))} className={`text-3xl transition-all ${reviewForm.rating >= r ? 'scale-110' : 'opacity-30 hover:opacity-60'}`}>⭐</button>
              ))}
            </div>
            <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Tell us about your experience..." rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={submitReview} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
