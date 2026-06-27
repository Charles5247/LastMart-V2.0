'use client';
export const dynamic = 'force-dynamic';
/**
 * Customer Custom Orders Page
 * Two modes:
 *   1. SPECIFIC ORDER — order a listed catalog product with custom specs/quantity/notes
 *   2. PRODUCT REQUEST — describe a product you want (not yet listed), upload a reference photo
 */

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/components/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import toast from 'react-hot-toast';
import {
  Plus, ShoppingCart, Image, Package, Search, Loader, ChevronRight,
  Clock, CheckCircle, XCircle, Upload, X, AlertCircle, Star, Store,
  ArrowLeft, Camera, Send
} from 'lucide-react';
import Link from 'next/link';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Awaiting Response', color: 'bg-yellow-100 text-yellow-700' },
  accepted:  { label: 'Accepted',          color: 'bg-green-100 text-green-700'   },
  quoted:    { label: 'Quote Received',    color: 'bg-blue-100 text-blue-700'     },
  rejected:  { label: 'Rejected',          color: 'bg-red-100 text-red-700'       },
  completed: { label: 'Completed',         color: 'bg-gray-100 text-gray-700'     },
  cancelled: { label: 'Cancelled',         color: 'bg-gray-100 text-gray-400'     },
};

export default function CustomOrdersPage() {
  const { user, token } = useApp();

  const [orders,      setOrders]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [orderType,   setOrderType]   = useState<'specific' | 'custom_request'>('specific');
  const [selected,    setSelected]    = useState<any>(null);

  // Vendor / product search
  const [vendors,         setVendors]         = useState<any[]>([]);
  const [vendorSearch,    setVendorSearch]     = useState('');
  const [selectedVendor,  setSelectedVendor]  = useState<any>(null);
  const [products,        setProducts]        = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productSearch,   setProductSearch]   = useState('');

  // Form fields
  const [form, setForm] = useState({
    title: '', description: '', quantity: 1,
    budget_min: '', budget_max: '', size_specs: '',
    color_preference: '', delivery_deadline: '', buyer_note: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/custom-orders', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setOrders(d.data); })
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line

  const searchVendors = async (q: string) => {
    setVendorSearch(q);
    if (q.length < 2) { setVendors([]); return; }
    const res = await fetch(`/api/vendors?search=${encodeURIComponent(q)}&limit=8`);
    const d = await res.json();
    setVendors(d.data || []);
  };

  const loadVendorProducts = async (vendorId: string) => {
    const res = await fetch(`/api/products?vendor_id=${vendorId}&limit=20`);
    const d = await res.json();
    setProducts(d.data?.products || d.data || []);
  };

  const openModal = (type: 'specific' | 'custom_request') => {
    setOrderType(type);
    setForm({ title: '', description: '', quantity: 1, budget_min: '', budget_max: '', size_specs: '', color_preference: '', delivery_deadline: '', buyer_note: '' });
    setSelectedVendor(null); setSelectedProduct(null); setVendors([]); setProducts([]);
    setPhotoFile(null); setPhotoPreview(null);
    setShowModal(true);
  };

  const handlePhotoChange = (f: File) => {
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!selectedVendor) return toast.error('Please select a vendor');
    if (!form.title.trim() || !form.description.trim()) return toast.error('Title and description are required');
    if (orderType === 'specific' && !selectedProduct) return toast.error('Please select a product from the catalog');

    setSubmitting(true);
    try {
      // 1. Create custom order
      const res = await fetch('/api/custom-orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          vendor_id:    selectedVendor.id,
          product_id:   selectedProduct?.id || null,
          type:         orderType,
          title:        form.title,
          description:  form.description,
          quantity:     form.quantity,
          budget_min:   form.budget_min ? parseFloat(form.budget_min) : null,
          budget_max:   form.budget_max ? parseFloat(form.budget_max) : null,
          size_specs:   form.size_specs || null,
          color_preference: form.color_preference || null,
          delivery_deadline: form.delivery_deadline || null,
          buyer_note:   form.buyer_note || null,
        }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Failed to send'); setSubmitting(false); return; }

      const orderId = data.data?.id;

      // 2. Upload reference photo if provided
      if (photoFile && orderId) {
        const fd = new FormData();
        fd.append('reference_photo', photoFile);
        await fetch(`/api/custom-orders/${orderId}/photos`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      toast.success('Request sent to vendor!');
      setOrders(prev => [data.data, ...prev]);
      setShowModal(false);
    } catch { toast.error('Failed to send request'); }
    setSubmitting(false);
  };

  const cancelOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/custom-orders/${id}/cancel`, { method: 'PUT', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
        toast.success('Order cancelled');
      } else {
        toast.error(data.error);
      }
    } catch { toast.error('Failed to cancel'); }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/customer/dashboard" className="hover:text-orange-600">Dashboard</Link>
                <ChevronRight size={14} />
                <span className="text-gray-800">Custom Orders</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900">Custom Orders & Requests</h1>
              <p className="text-gray-500 text-sm mt-1">Order specific products or request items not yet listed</p>
            </div>
          </div>

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => openModal('specific')}
              className="bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:border-orange-300 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors">
                <ShoppingCart className="text-orange-500 group-hover:text-white transition-colors" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">Specific Order</h3>
              <p className="text-sm text-gray-500">
                Order a product already listed in a vendor&apos;s catalog — with custom quantity, size, color, or special notes.
              </p>
              <div className="mt-4 flex items-center text-orange-600 text-sm font-medium gap-1">
                Order Now <ChevronRight size={14} />
              </div>
            </button>

            <button
              onClick={() => openModal('custom_request')}
              className="bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:border-purple-300 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                <Camera className="text-purple-500 group-hover:text-white transition-colors" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">Product Request</h3>
              <p className="text-sm text-gray-500">
                Looking for something not yet listed? Upload a photo sample and describe exactly what you need.
              </p>
              <div className="mt-4 flex items-center text-purple-600 text-sm font-medium gap-1">
                Send Request <ChevronRight size={14} />
              </div>
            </button>
          </div>

          {/* Orders list */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-50">
              <h2 className="font-bold text-gray-800">My Requests</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="animate-spin text-orange-500" size={28} />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="mx-auto text-gray-200 mb-3" size={48} />
                <p className="text-gray-400 text-sm">No custom orders yet</p>
                <p className="text-gray-400 text-xs mt-1">Use the buttons above to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map(order => {
                  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
                  return (
                    <div key={order.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${order.type === 'specific' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                              {order.type === 'specific' ? 'Specific Order' : 'Product Request'}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 truncate">{order.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{order.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Store size={11} />{order.store_name}</span>
                            {order.product_name && <span className="flex items-center gap-1"><Package size={11} />{order.product_name}</span>}
                            <span className="flex items-center gap-1"><Clock size={11} />{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>

                          {/* Vendor quote */}
                          {order.status === 'quoted' && order.vendor_quote && (
                            <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-sm">
                              <span className="font-semibold text-blue-700">
                                Vendor Quote: ₦{Number(order.vendor_quote).toLocaleString()}
                              </span>
                              {order.vendor_note && <p className="text-blue-600 text-xs mt-1">{order.vendor_note}</p>}
                            </div>
                          )}
                          {order.status === 'rejected' && order.vendor_note && (
                            <div className="mt-2 bg-red-50 rounded-lg px-3 py-2 text-sm text-red-600">
                              {order.vendor_note}
                            </div>
                          )}
                        </div>

                        {/* Reference photo */}
                        {order.reference_photo_url && (
                          <img
                            src={order.reference_photo_url}
                            alt="reference"
                            className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0"
                          />
                        )}
                      </div>

                      {/* Actions */}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="mt-3 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <XCircle size={12} /> Cancel Request
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg my-8 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2
                  ${orderType === 'specific' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {orderType === 'specific' ? <ShoppingCart size={12} /> : <Camera size={12} />}
                  {orderType === 'specific' ? 'Specific Order' : 'Product Request'}
                </div>
                <h3 className="font-black text-gray-800 text-lg">
                  {orderType === 'specific' ? 'Order from Vendor Catalog' : 'Request a Custom Product'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Vendor search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Vendor <span className="text-red-500">*</span></label>
                {selectedVendor ? (
                  <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                    {selectedVendor.logo_url
                      ? <img src={selectedVendor.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                      : <Store size={20} className="text-orange-500" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{selectedVendor.store_name}</p>
                      <p className="text-xs text-gray-500 truncate">{selectedVendor.city}</p>
                    </div>
                    <button onClick={() => { setSelectedVendor(null); setSelectedProduct(null); setProducts([]); }}
                      className="text-gray-400 hover:text-red-500">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Search by store name or city..."
                      value={vendorSearch}
                      onChange={e => searchVendors(e.target.value)}
                    />
                    {vendors.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-100 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {vendors.map(v => (
                          <button
                            key={v.id}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 text-left"
                            onClick={() => {
                              setSelectedVendor(v);
                              setVendors([]);
                              setVendorSearch('');
                              if (orderType === 'specific') loadVendorProducts(v.id);
                            }}
                          >
                            {v.logo_url
                              ? <img src={v.logo_url} className="w-7 h-7 rounded-lg object-cover" alt="" />
                              : <Store size={16} className="text-orange-500" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{v.store_name}</p>
                              <p className="text-xs text-gray-400">{v.city}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product selection (specific orders only) */}
              {orderType === 'specific' && selectedVendor && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Product <span className="text-red-500">*</span></label>
                  {selectedProduct ? (
                    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      {selectedProduct.images?.[0]
                        ? <img src={selectedProduct.images[0]} className="w-10 h-10 rounded-xl object-cover" alt="" />
                        : <Package size={20} className="text-orange-500" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{selectedProduct.name}</p>
                        <p className="text-xs font-bold text-orange-600">₦{Number(selectedProduct.price).toLocaleString()}</p>
                      </div>
                      <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-red-500">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative mb-2">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {products
                          .filter(p => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                          .map(p => {
                            const imgs = typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []);
                            return (
                              <button
                                key={p.id}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-orange-50 rounded-xl text-left"
                                onClick={() => setSelectedProduct({ ...p, images: imgs })}
                              >
                                {imgs[0]
                                  ? <img src={imgs[0]} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                  : <Package size={16} className="text-gray-400" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                  <p className="text-xs text-orange-600 font-semibold">₦{Number(p.price).toLocaleString()}</p>
                                </div>
                              </button>
                            );
                          })}
                        {products.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">No products found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {orderType === 'specific' ? 'Order Title *' : 'Product Name / Title *'}
                </label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={orderType === 'specific' ? 'e.g. Blue T-shirt in size XL' : 'e.g. Custom printed hoodie with logo'}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder={orderType === 'specific'
                    ? 'Describe the exact specifications you need (colour, size, finish, etc.)'
                    : 'Describe the product in detail — material, dimensions, purpose, any specific requirements...'}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Reference photo (custom requests) */}
              {orderType === 'custom_request' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reference Photo (optional)</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                      ${photoPreview ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-orange-300'}`}
                    onClick={() => photoRef.current?.click()}
                  >
                    {photoPreview
                      ? <img src={photoPreview} className="max-h-28 mx-auto rounded-xl object-contain" alt="ref" />
                      : <div className="py-3">
                          <Camera className="mx-auto text-gray-300 mb-1" size={24} />
                          <p className="text-xs text-gray-400">Upload a sample photo of what you&apos;re looking for</p>
                        </div>
                    }
                    <input ref={photoRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f); }} />
                  </div>
                  {photoPreview && (
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <X size={11} /> Remove photo
                    </button>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" min={1} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Min (₦)</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. 5000"
                    value={form.budget_min}
                    onChange={e => setForm(f => ({ ...f, budget_min: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Max (₦)</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. 15000"
                    value={form.budget_max}
                    onChange={e => setForm(f => ({ ...f, budget_max: e.target.value }))} />
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size / Dimensions</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. XL, 30×20cm"
                    value={form.size_specs}
                    onChange={e => setForm(f => ({ ...f, size_specs: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colour Preference</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Navy blue, Red"
                    value={form.color_preference}
                    onChange={e => setForm(f => ({ ...f, color_preference: e.target.value }))} />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Deadline</label>
                <input type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.delivery_deadline}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, delivery_deadline: e.target.value }))} />
              </div>

              {/* Additional note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Note</label>
                <textarea rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Any other details..."
                  value={form.buyer_note}
                  onChange={e => setForm(f => ({ ...f, buyer_note: e.target.value }))} />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-3">Cancel</button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
