'use client';
export const dynamic = 'force-dynamic';
/**
 * Vendor Custom Orders Management
 * Vendors see incoming specific orders and product requests, and can:
 *   - Accept (confirm they can fulfill)
 *   - Quote (provide a price)
 *   - Reject (with a note explaining why)
 */

import { useState, useEffect } from 'react';
import { useApp } from '@/components/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import toast from 'react-hot-toast';
import {
  Package, Camera, CheckCircle, XCircle, MessageSquare, Clock,
  Loader, ChevronRight, User, Store, Image, X, DollarSign, Eye
} from 'lucide-react';
import Link from 'next/link';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Awaiting Response', color: 'bg-yellow-100 text-yellow-700' },
  accepted:  { label: 'Accepted',          color: 'bg-green-100 text-green-700'   },
  quoted:    { label: 'Quoted',            color: 'bg-blue-100 text-blue-700'     },
  rejected:  { label: 'Rejected',          color: 'bg-red-100 text-red-700'       },
  completed: { label: 'Completed',         color: 'bg-gray-100 text-gray-700'     },
  cancelled: { label: 'Cancelled',         color: 'bg-gray-100 text-gray-400'     },
};

export default function VendorCustomOrdersPage() {
  const { user, token } = useApp();
  const [orders,     setOrders]    = useState<any[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [selected,   setSelected]  = useState<any>(null);
  const [responding, setResponding]= useState(false);
  const [filter,     setFilter]    = useState('all');

  const [response, setResponse] = useState({
    status: 'accepted' as 'accepted' | 'quoted' | 'rejected',
    vendor_note: '',
    vendor_quote: '',
  });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/custom-orders/vendor', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setOrders(d.data); })
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line

  const respondToOrder = async () => {
    if (!selected) return;
    if (!response.vendor_note.trim()) return toast.error('Please add a note to the buyer');
    if (response.status === 'quoted' && !response.vendor_quote) return toast.error('Please enter a quote amount');

    setResponding(true);
    try {
      const res = await fetch(`/api/custom-orders/${selected.id}/respond`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(response),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === selected.id
          ? { ...o, status: response.status, vendor_note: response.vendor_note, vendor_quote: response.vendor_quote || null }
          : o
        ));
        toast.success(`Order ${response.status} successfully`);
        setSelected(null);
      } else {
        toast.error(data.error || 'Failed to respond');
      }
    } catch { toast.error('Failed to respond'); }
    setResponding(false);
  };

  const filtered = orders.filter(o => filter === 'all' || o.status === filter || o.type === filter);
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/vendor/dashboard" className="hover:text-orange-600">Dashboard</Link>
                <ChevronRight size={14} />
                <span className="text-gray-800">Custom Orders</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">Custom Orders</h1>
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {pendingCount} new
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {[
              { value: 'all',            label: 'All' },
              { value: 'pending',        label: 'Pending' },
              { value: 'specific',       label: 'Specific Orders' },
              { value: 'custom_request', label: 'Product Requests' },
              { value: 'accepted',       label: 'Accepted' },
              { value: 'quoted',         label: 'Quoted' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  ${filter === f.value ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                {f.label}
                {f.value === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Orders */}
          <div className="bg-white rounded-2xl shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="animate-spin text-orange-500" size={28} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Package className="mx-auto text-gray-200 mb-3" size={48} />
                <p className="text-gray-400 text-sm">No custom orders found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map(order => {
                  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
                  return (
                    <div
                      key={order.id}
                      className={`p-5 hover:bg-gray-50 transition-colors cursor-pointer
                        ${order.status === 'pending' ? 'border-l-4 border-orange-400' : ''}`}
                      onClick={() => { setSelected(order); setResponse({ status: 'accepted', vendor_note: '', vendor_quote: '' }); }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${order.type === 'specific' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                              {order.type === 'specific' ? '📦 Specific Order' : '📷 Product Request'}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 truncate">{order.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{order.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><User size={11} /> {order.buyer_name}</span>
                            {order.product_name && <span className="flex items-center gap-1"><Package size={11} /> {order.product_name}</span>}
                            <span className="flex items-center gap-1"><Clock size={11} /> {new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          {order.budget_max && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              Budget: ₦{Number(order.budget_min || 0).toLocaleString()} – ₦{Number(order.budget_max).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {order.reference_photo_url && (
                          <img
                            src={order.reference_photo_url}
                            alt="ref"
                            className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail / respond modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg my-8 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-black text-gray-800">Order Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[selected.status]?.color}`}>
                  {STATUS_BADGE[selected.status]?.label}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium
                  ${selected.type === 'specific' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {selected.type === 'specific' ? 'Specific Order' : 'Product Request'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-gray-800">{selected.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Buyer</p>
                  <p className="font-medium text-gray-800">{selected.buyer_name}</p>
                  {selected.buyer_phone && <p className="text-xs text-gray-500">{selected.buyer_phone}</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                  <p className="font-medium text-gray-800">{selected.quantity} unit(s)</p>
                </div>
                {selected.budget_min && (
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Budget Range</p>
                    <p className="font-semibold text-green-700">
                      ₦{Number(selected.budget_min).toLocaleString()} – ₦{Number(selected.budget_max || 0).toLocaleString()}
                    </p>
                  </div>
                )}
                {selected.delivery_deadline && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
                    <p className="font-medium text-gray-800">{new Date(selected.delivery_deadline).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {(selected.size_specs || selected.color_preference) && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  {selected.size_specs && <p><span className="text-gray-400">Size/Dims:</span> <span className="font-medium">{selected.size_specs}</span></p>}
                  {selected.color_preference && <p><span className="text-gray-400">Colour:</span> <span className="font-medium">{selected.color_preference}</span></p>}
                </div>
              )}

              {selected.reference_photo_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Reference Photo</p>
                  <img src={selected.reference_photo_url} alt="reference" className="max-h-48 rounded-xl object-contain border border-gray-100" />
                </div>
              )}

              {/* Respond section (only for pending orders) */}
              {selected.status === 'pending' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="font-bold text-gray-800 text-sm">Your Response</h4>

                  {/* Status choice */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'accepted', label: 'Accept',   color: 'border-green-400 bg-green-50 text-green-700' },
                      { value: 'quoted',   label: 'Quote',    color: 'border-blue-400 bg-blue-50 text-blue-700' },
                      { value: 'rejected', label: 'Reject',   color: 'border-red-300 bg-red-50 text-red-700' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setResponse(r => ({ ...r, status: opt.value }))}
                        className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all
                          ${response.status === opt.value ? opt.color : 'border-gray-200 text-gray-500'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Quote amount */}
                  {response.status === 'quoted' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quote Amount (₦) *</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your price"
                        value={response.vendor_quote}
                        onChange={e => setResponse(r => ({ ...r, vendor_quote: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message to Buyer *</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      placeholder={
                        response.status === 'accepted' ? 'Let the buyer know you can fulfil their request...'
                        : response.status === 'quoted' ? 'Explain your quote and timeline...'
                        : 'Explain why you cannot fulfil this request...'
                      }
                      value={response.vendor_note}
                      onChange={e => setResponse(r => ({ ...r, vendor_note: e.target.value }))}
                    />
                  </div>

                  <button
                    onClick={respondToOrder}
                    disabled={responding}
                    className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                      ${response.status === 'rejected' ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'btn-primary'}`}
                  >
                    {responding ? <Loader size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    {response.status === 'accepted' ? 'Accept Order'
                    : response.status === 'quoted'   ? 'Send Quote'
                    : 'Reject Request'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
