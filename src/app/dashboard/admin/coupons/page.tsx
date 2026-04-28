'use client';
/**
 * ─── Admin Coupon Management Page ────────────────────────────────────────────
 * Admin can:
 *   1. View all coupon codes
 *   2. Create new coupons (fixed/percent) with optional target spend threshold
 *   3. Enable/disable coupons
 *   4. See usage statistics
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy,
  ArrowLeft, Users, CheckCircle, Clock, DollarSign,
  Gift, Search, X, Loader, AlertTriangle
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number;
  uses_count: number;
  is_active: number;
  expires_at?: string;
  description?: string;
  created_by_name?: string;
  created_at: string;
}

const EMPTY_FORM = {
  code:           '',
  type:           'fixed',
  value:          '',
  min_order:      '',
  max_uses:       '',
  expires_at:     '',
  description:    '',
  target_min_spend: '',
};

export default function AdminCouponsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();

  const [coupons,  setCoupons]  = useState<Coupon[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ ...EMPTY_FORM });
  const [search,   setSearch]   = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) { router.push('/'); return; }
    if (user) fetchCoupons();
  }, [user, isLoading]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/coupons', { headers });
      const data = await res.json();
      if (data.success) setCoupons(data.data);
    } catch { toast.error('Failed to load coupons'); }
    setLoading(false);
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value || parseFloat(form.value) <= 0) { toast.error('Value required'); return; }
    setSaving(true);
    try {
      const body: any = {
        type:        form.type,
        value:       parseFloat(form.value),
        description: form.description || undefined,
      };
      if (form.code)           body.code           = form.code;
      if (form.min_order)      body.min_order      = parseFloat(form.min_order);
      if (form.max_uses)       body.max_uses       = parseInt(form.max_uses);
      if (form.expires_at)     body.expires_at     = form.expires_at;
      if (form.target_min_spend) body.target_min_spend = parseFloat(form.target_min_spend);

      const res  = await fetch('/api/coupons', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        toast.success('Coupon created! ' + (form.target_min_spend ? 'Qualifying users notified.' : ''));
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
        fetchCoupons();
      } else toast.error(data.error);
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const toggleCoupon = async (id: string, current: number) => {
    try {
      await fetch(`/api/coupons/${id}`, { method: 'PUT', headers, body: JSON.stringify({ is_active: current ? 0 : 1 }) });
      setCoupons(cs => cs.map(c => c.id === id ? { ...c, is_active: current ? 0 : 1 } : c));
      toast.success(current ? 'Coupon disabled' : 'Coupon enabled');
    } catch { toast.error('Failed to update'); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Disable this coupon? (It will no longer be usable)')) return;
    await toggleCoupon(id, 1);
  };

  const filtered = coupons.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = coupons.filter(c => c.is_active).length;
  const totalUses     = coupons.reduce((s, c) => s + c.uses_count, 0);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-80">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Tag className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Coupon Management</h1>
                <p className="text-white/70 text-sm mt-0.5">Create and manage discount coupons for customers</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-white text-purple-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-50 transition-colors shadow"
            >
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Create Coupon</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Coupons',  value: coupons.length, icon: Tag,          color: 'purple' },
            { label: 'Active',         value: activeCount,    icon: CheckCircle,  color: 'green'  },
            { label: 'Total Uses',     value: totalUses,      icon: Users,        color: 'blue'   },
            { label: 'Inactive',       value: coupons.length - activeCount, icon: Clock, color: 'orange' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className={`w-8 h-8 bg-${s.color}-100 rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Create Coupon Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-purple-100">
            <h2 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" /> Create New Coupon
            </h2>
            <form onSubmit={createCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Code <span className="text-gray-400 font-normal">(leave blank to auto-generate)</span></label>
                  <input className="input" placeholder="e.g. PROMO2025" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="label">Type *</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="fixed">Fixed Amount (₦)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    Value * {form.type === 'fixed' ? '(₦ amount off)' : '(% discount)'}
                  </label>
                  <input type="number" min="0" step="0.01" className="input" placeholder={form.type === 'fixed' ? 'e.g. 1000' : 'e.g. 10'} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Min Order Amount (₦)</label>
                  <input type="number" min="0" className="input" placeholder="e.g. 5000 (or 0 for no min)" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Uses <span className="text-gray-400 font-normal">(0 = unlimited)</span></label>
                  <input type="number" min="0" className="input" placeholder="e.g. 100" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description / Purpose</label>
                  <input className="input" placeholder="e.g. Eid promotion, Returning customer reward…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              {/* Auto-notify box */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4" /> Auto-Send to Loyal Customers
                </h4>
                <p className="text-xs text-blue-600 mb-3">
                  Optionally, auto-notify all customers who have spent above a threshold. Leave blank to skip.
                </p>
                <div>
                  <label className="label">Minimum Total Spend (₦)</label>
                  <input type="number" min="0" className="input max-w-xs" placeholder="e.g. 30000 → notify customers who spent ≥ ₦30,000" value={form.target_min_spend} onChange={e => setForm(f => ({ ...f, target_min_spend: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-6">
                  {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Coupon</>}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }} className="btn-secondary text-sm px-5">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search coupons by code or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Coupon list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No coupons found</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-5 py-2.5 mt-4">
              Create First Coupon
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div
                key={c.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${
                  c.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Coupon code badge */}
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl px-4 py-2 text-white text-center min-w-[120px] flex-shrink-0">
                    <p className="font-black text-base tracking-widest">{c.code}</p>
                    <p className="text-white/80 text-xs mt-0.5">
                      {c.type === 'percent' || c.type === 'referral'
                        ? `${c.value}% off`
                        : `₦${Number(c.value).toLocaleString()} off`}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    {c.description && (
                      <p className="text-sm text-gray-700 font-medium truncate">{c.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {c.min_order > 0 && <span>Min order: ₦{Number(c.min_order).toLocaleString()}</span>}
                      <span>{c.uses_count} use{c.uses_count !== 1 ? 's' : ''}{c.max_uses > 0 ? ` / ${c.max_uses}` : ''}</span>
                      {c.expires_at && <span>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>}
                      {c.created_by_name && <span>By: {c.created_by_name}</span>}
                    </div>
                  </div>

                  {/* Status & actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleCoupon(c.id, c.is_active)}
                      className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400"
                      title={c.is_active ? 'Disable' : 'Enable'}
                    >
                      {c.is_active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Code copied!'); }}
                      className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400"
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCoupon(c.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                      title="Disable coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage guide */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Admin Coupon Guide
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-700">
            <div className="space-y-1.5">
              <p><strong>Fixed:</strong> Subtracts a fixed naira amount from the order total</p>
              <p><strong>Percent:</strong> Deducts a percentage of the order total</p>
              <p><strong>Referral:</strong> Auto-generated 0.5% coupons for referred users</p>
            </div>
            <div className="space-y-1.5">
              <p><strong>Auto-notify:</strong> Enter a min spend threshold to automatically push the coupon to qualifying loyal customers</p>
              <p><strong>Max Uses:</strong> Set to 0 for unlimited usage (market-wide promos)</p>
              <p><strong>Code:</strong> Leave blank to auto-generate a unique code</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
