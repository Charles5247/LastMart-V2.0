'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Megaphone, ArrowLeft, Plus, Tag, Percent, Calendar, Package, CheckCircle, Clock, XCircle, Edit2, Trash2 } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const PROMO_TYPES = [
  { id: 'discount', label: '% Discount', desc: 'Percentage off product price', icon: Percent },
  { id: 'flash_sale', label: 'Flash Sale', desc: 'Time-limited heavy discount', icon: Clock },
  { id: 'buy_x_get_y', label: 'Buy X Get Y', desc: 'Buy 2 get 1 free etc.', icon: Package },
  { id: 'bundle', label: 'Bundle Deal', desc: 'Discount for product bundles', icon: Tag },
];

export default function VendorPromotionsPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'discount', discount_percent: '', product_ids: [] as string[],
    start_date: '', end_date: '', min_purchase: '',
    buy_quantity: '', get_quantity: '',
  });

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'vendor') { router.push('/'); return; }
    if (user) fetchData();
  }, [user, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [promoRes, productRes] = await Promise.all([
        fetch('/api/vendors/promotions', { headers }),
        fetch('/api/vendors/products?limit=100', { headers }),
      ]);
      const [p, pr] = await Promise.all([promoRes.json(), productRes.json()]);
      if (p.success) setPromotions(p.data || []);
      if (pr.success) setProducts(pr.data || []);
    } catch {}
    setLoading(false);
  };

  const createPromotion = async () => {
    if (!form.title || !form.type || !form.start_date || !form.end_date) {
      toast.error('Please fill all required fields'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/vendors/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { toast.success('Promotion created!'); setShowForm(false); fetchData(); }
      else toast.error(data.message || 'Failed');
    } catch { toast.error('Error creating promotion'); }
    setSubmitting(false);
  };

  const deletePromotion = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    try {
      const res = await fetch(`/api/vendors/promotions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { toast.success('Promotion deleted'); fetchData(); }
    } catch { toast.error('Error deleting'); }
  };

  const statusColor = (s: string) => ({ active: 'bg-green-100 text-green-700', scheduled: 'bg-blue-100 text-blue-700', expired: 'bg-gray-100 text-gray-500', paused: 'bg-yellow-100 text-yellow-700' }[s] || 'bg-gray-100 text-gray-600');

  const getPromoStatus = (promo: any) => {
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';
    return 'active';
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/vendor" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-orange-500" /> Promotions
              </h1>
              <p className="text-gray-500 text-sm">Create discounts and flash sales to boost sales</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-orange-600 text-sm">
            <Plus className="w-4 h-4" /> New Promotion
          </button>
        </div>

        {/* Promo Types */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {PROMO_TYPES.map(({ id, label, desc, icon: Icon }) => (
            <button key={id} onClick={() => { setForm(f => ({ ...f, type: id })); setShowForm(true); }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all text-left group">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-100">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <div className="font-black text-sm text-gray-800">{label}</div>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </button>
          ))}
        </div>

        {/* Active Promotions */}
        <h3 className="font-black text-gray-800 mb-4">Your Promotions</h3>
        {promotions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Megaphone className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="font-black text-gray-700 text-lg mb-2">No promotions yet</h3>
            <p className="text-gray-400 text-sm mb-4">Create your first promotion to boost sales</p>
            <button onClick={() => setShowForm(true)} className="bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-600">Create Promotion</button>
          </div>
        ) : (
          <div className="space-y-4">
            {promotions.map((promo: any) => {
              const status = getPromoStatus(promo);
              return (
                <div key={promo.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(status)}`}>{status.toUpperCase()}</span>
                        <span className="text-xs text-gray-400 capitalize">{promo.type?.replace('_', ' ')}</span>
                      </div>
                      <h4 className="font-black text-gray-800 mb-1">{promo.title}</h4>
                      <div className="text-sm text-gray-500 flex flex-wrap gap-4">
                        {promo.discount_percent && <span>💸 {promo.discount_percent}% off</span>}
                        <span>📅 {formatDate(promo.start_date)} → {formatDate(promo.end_date)}</span>
                        {promo.product_count && <span>📦 {promo.product_count} products</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => deletePromotion(promo.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Promotion Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black text-gray-800 mb-5">Create Promotion</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Promotion Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Weekend Flash Sale" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Promotion Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROMO_TYPES.map(({ id, label }) => (
                      <button key={id} onClick={() => setForm(f => ({ ...f, type: id }))}
                        className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.type === id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {(form.type === 'discount' || form.type === 'flash_sale') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Discount % *</label>
                    <input type="number" min="1" max="90" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                      placeholder="e.g. 20" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                )}
                {form.type === 'buy_x_get_y' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Buy Quantity</label>
                      <input type="number" value={form.buy_quantity} onChange={e => setForm(f => ({ ...f, buy_quantity: e.target.value }))}
                        placeholder="2" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Get Quantity Free</label>
                      <input type="number" value={form.get_quantity} onChange={e => setForm(f => ({ ...f, get_quantity: e.target.value }))}
                        placeholder="1" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                    <input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
                    <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min. Purchase (optional)</label>
                  <input type="number" value={form.min_purchase} onChange={e => setForm(f => ({ ...f, min_purchase: e.target.value }))}
                    placeholder="e.g. 5000" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Apply to Products</label>
                  <div className="max-h-36 overflow-y-auto border-2 border-gray-200 rounded-xl">
                    {products.length === 0 ? (
                      <div className="p-3 text-center text-gray-400 text-sm">No products found</div>
                    ) : (
                      products.map((p: any) => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                          <input type="checkbox" checked={form.product_ids.includes(p.id)}
                            onChange={e => setForm(f => ({ ...f, product_ids: e.target.checked ? [...f.product_ids, p.id] : f.product_ids.filter(id => id !== p.id) }))}
                            className="w-4 h-4 accent-orange-500" />
                          <span className="text-sm text-gray-700">{p.name}</span>
                          <span className="ml-auto text-xs text-gray-400">{formatPrice(p.price)}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave empty to apply to all products</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600">Cancel</button>
                <button onClick={createPromotion} disabled={submitting}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Promotion'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
