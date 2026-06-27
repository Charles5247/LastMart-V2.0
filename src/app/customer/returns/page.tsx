'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { RotateCcw, ArrowLeft, Plus, Upload, CheckCircle, Clock, XCircle, Package } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const RETURN_REASONS = [
  'Wrong item delivered', 'Item damaged on arrival', 'Item does not match description',
  'Defective product', 'Changed my mind', 'Counterfeit item', 'Other',
];

export default function ReturnsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [returns, setReturns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ order_id: '', reason: '', description: '', refund_method: 'wallet', evidence: null as File | null });

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchData();
  }, [user, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [returnsRes, ordersRes] = await Promise.all([
        fetch('/api/returns', { headers }),
        fetch('/api/orders?status=delivered&limit=20', { headers }),
      ]);
      const [r, o] = await Promise.all([returnsRes.json(), ordersRes.json()]);
      if (r.success) setReturns(r.data || []);
      if (o.success) setOrders(o.data || []);
    } catch {}
    setLoading(false);
  };

  const submitReturn = async () => {
    if (!form.order_id || !form.reason || !form.description) {
      toast.error('Please fill all required fields'); return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('order_id', form.order_id);
      formData.append('reason', form.reason);
      formData.append('description', form.description);
      formData.append('refund_method', form.refund_method);
      if (form.evidence) formData.append('evidence', form.evidence);
      const res = await fetch('/api/returns', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Return request submitted!'); setShowForm(false); fetchData();
      } else toast.error(data.message || 'Failed to submit');
    } catch { toast.error('Error submitting return'); }
    setSubmitting(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      refunded: 'bg-green-100 text-green-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/customer/dashboard" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-6 h-6 text-orange-500" /> Returns & Refunds
              </h1>
              <p className="text-gray-500 text-sm">Request returns within 7 days of delivery</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-orange-600 text-sm">
            <Plus className="w-4 h-4" /> New Return
          </button>
        </div>

        {/* Policy Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
          <h4 className="font-bold text-orange-800 mb-2">📦 Return Policy</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>✅ 7-day return window from delivery date</li>
            <li>✅ Full refund for damaged or wrong items</li>
            <li>✅ Refund to wallet or original payment method</li>
            <li>⚠️ Perishable goods and digital items are non-refundable</li>
          </ul>
        </div>

        {/* Returns List */}
        {returns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <RotateCcw className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="font-black text-gray-700 text-lg mb-2">No Return Requests</h3>
            <p className="text-gray-400 text-sm">All your orders have been satisfactory so far!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-black text-gray-800 mb-1">Return Request #{r.id?.slice(0, 8)}</div>
                    <div className="text-sm text-gray-500 mb-2">Order: #{r.order_id?.slice(0, 8)} · {formatDate(r.created_at)}</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">{r.reason}</div>
                    <p className="text-sm text-gray-500">{r.description}</p>
                    <div className="mt-2 text-sm text-gray-600">
                      Refund to: <span className="font-semibold capitalize">{r.refund_method}</span>
                    </div>
                    {r.admin_note && (
                      <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="text-xs font-bold text-blue-600 mb-1">Admin Note:</div>
                        <p className="text-sm text-blue-800">{r.admin_note}</p>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${statusBadge(r.status)}`}>
                    {r.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Return Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black text-gray-800 mb-5">Request a Return</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Order *</label>
                  <select value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">Choose delivered order</option>
                    {orders.map((o: any) => (
                      <option key={o.id} value={o.id}>#{o.id?.slice(0, 8)} — {formatPrice(o.total_amount)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
                  <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">Select reason</option>
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Details *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the issue..." rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Refund Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ v: 'wallet', label: '💰 Wallet Credit' }, { v: 'original', label: '💳 Original Payment' }].map(({ v, label }) => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, refund_method: v }))}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.refund_method === v ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Evidence (optional)</label>
                  <div className={`border-2 border-dashed rounded-xl p-4 ${form.evidence ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <label className="cursor-pointer flex items-center gap-3">
                      <Upload className={`w-5 h-5 ${form.evidence ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-500">{form.evidence ? form.evidence.name : 'Upload photo of damaged/wrong item'}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => setForm(f => ({ ...f, evidence: e.target.files?.[0] || null }))} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600">Cancel</button>
                <button onClick={submitReturn} disabled={submitting}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
