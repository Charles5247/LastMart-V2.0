'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Megaphone, ArrowLeft, Plus, Eye, MousePointer, TrendingUp, DollarSign, X, Calendar, Target } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function VendorAdsPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_id: '', type: 'sponsored_product', title: '', description: '', budget: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], target_city: vendor?.city || '' });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) { router.push('/auth/login'); return; }
    if (user && vendor) { fetchAds(); fetchProducts(); }
  }, [user, vendor, isLoading]);

  const fetchAds = async () => {
    setLoading(true);
    const res = await fetch('/api/ads', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setAds(data.data.filter((a: any) => a.vendor_id === vendor?.id));
    setLoading(false);
  };

  const fetchProducts = async () => {
    if (!vendor) return;
    const res = await fetch(`/api/products?vendor_id=${vendor.id}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setProducts(data.data);
  };

  const createAd = async () => {
    if (!form.title || !form.budget || !form.start_date || !form.end_date) { toast.error('Please fill all required fields'); return; }
    setSaving(true);
    const res = await fetch('/api/ads', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, budget: parseFloat(form.budget) }) });
    const data = await res.json();
    if (data.success) { toast.success('Ad campaign created!'); setShowModal(false); fetchAds(); }
    else toast.error(data.error || 'Failed');
    setSaving(false);
  };

  const adTypes = [
    { value: 'sponsored_product', label: '🎯 Sponsored Product', desc: 'Feature your product at top of search' },
    { value: 'featured_vendor', label: '⭐ Featured Store', desc: 'Appear in featured vendors section' },
    { value: 'banner', label: '📢 Banner Ad', desc: 'Display banner on marketplace' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/vendor" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Advertisement Center</h1>
              <p className="text-gray-500 text-sm">Promote your products to more customers</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 shadow-lg">
            <Plus className="w-4 h-4" /> Create Ad
          </button>
        </div>

        {/* Ad Types Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {adTypes.map(type => (
            <div key={type.value} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <p className="text-lg font-bold text-gray-800 mb-1">{type.label}</p>
              <p className="text-sm text-gray-500">{type.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Ads', value: ads.length, icon: Megaphone, color: 'from-purple-400 to-purple-600' },
            { label: 'Active Ads', value: ads.filter(a => a.status === 'active').length, icon: TrendingUp, color: 'from-green-400 to-green-600' },
            { label: 'Total Impressions', value: ads.reduce((s, a) => s + (a.impressions || 0), 0), icon: Eye, color: 'from-blue-400 to-blue-600' },
            { label: 'Total Clicks', value: ads.reduce((s, a) => s + (a.clicks || 0), 0), icon: MousePointer, color: 'from-orange-400 to-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-800">{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ads List */}
        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : ads.length > 0 ? (
          <div className="space-y-4">
            {ads.map(ad => (
              <div key={ad.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{ad.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{ad.type.replace('_', ' ').toUpperCase()} {ad.target_city && `· ${ad.target_city}`}</p>
                    {ad.product_name && <p className="text-xs text-orange-500 mt-1">Product: {ad.product_name}</p>}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${ad.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{ad.status.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-gray-800">{formatPrice(ad.budget)}</p>
                    <p className="text-xs text-gray-500">Budget</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-gray-800">{ad.impressions?.toLocaleString() || 0}</p>
                    <p className="text-xs text-gray-500">Impressions</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-gray-800">{ad.clicks || 0}</p>
                    <p className="text-xs text-gray-500">Clicks</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-gray-800">{ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0'}%</p>
                    <p className="text-xs text-gray-500">CTR</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(ad.start_date)} → {formatDate(ad.end_date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No ads yet</h3>
            <p className="text-gray-400 mb-6">Create your first ad campaign to reach more customers</p>
            <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600">Create Campaign</button>
          </div>
        )}
      </div>

      {/* Create Ad Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800">Create Ad Campaign</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Ad Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                  {adTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.type === 'sponsored_product' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Select Product</label>
                  <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">Select a product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Ad Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Catchy ad headline..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your promotion..." rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Budget (₦) *</label>
                  <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="5000" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Target City</label>
                  <input value={form.target_city} onChange={e => setForm(f => ({ ...f, target_city: e.target.value }))} placeholder="Lagos" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">End Date *</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={createAd} disabled={saving} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Creating...' : 'Launch Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
