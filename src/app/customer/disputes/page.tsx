'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { AlertCircle, ArrowLeft, Plus, Upload, MessageCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const DISPUTE_REASONS = [
  'Item not received', 'Item damaged', 'Wrong item received',
  'Item not as described', 'Partial delivery', 'Counterfeit product',
  'Seller unresponsive', 'Other',
];

export default function DisputesPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ order_id: '', reason: '', description: '', evidence: null as File | null });

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchData();
  }, [user, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [disputesRes, ordersRes] = await Promise.all([
        fetch('/api/disputes', { headers }),
        fetch('/api/orders?status=delivered&limit=20', { headers }),
      ]);
      const [d, o] = await Promise.all([disputesRes.json(), ordersRes.json()]);
      if (d.success) setDisputes(d.data || []);
      if (o.success) setOrders(o.data || []);
    } catch {}
    setLoading(false);
  };

  const submitDispute = async () => {
    if (!form.order_id || !form.reason || !form.description) {
      toast.error('Please fill all required fields'); return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('order_id', form.order_id);
      formData.append('reason', form.reason);
      formData.append('description', form.description);
      if (form.evidence) formData.append('evidence', form.evidence);
      const res = await fetch('/api/disputes', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Dispute filed! We\'ll investigate within 48 hours.'); setShowForm(false); fetchData();
      } else toast.error(data.message || 'Failed to file dispute');
    } catch { toast.error('Error filing dispute'); }
    setSubmitting(false);
  };

  const statusIcon = (status: string) => {
    if (status === 'resolved') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const statusColor = (status: string) => {
    if (status === 'resolved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'escalated') return 'bg-purple-100 text-purple-700';
    return 'bg-yellow-100 text-yellow-700';
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
                <AlertCircle className="w-6 h-6 text-red-500" /> Disputes
              </h1>
              <p className="text-gray-500 text-sm">File and track order disputes</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-orange-600 text-sm">
            <Plus className="w-4 h-4" /> File Dispute
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Buyer Protection:</strong> LastMart escrow holds your payment until you confirm delivery. 
              You can file a dispute within 7 days of receiving your order.
            </div>
          </div>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="font-black text-gray-700 text-lg mb-2">No Disputes</h3>
            <p className="text-gray-400 text-sm">All your orders have been resolved peacefully 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d: any) => (
              <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(d.status)}
                      <span className="font-black text-gray-800">Dispute #{d.id?.slice(0, 8)}</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">Order: #{d.order_id?.slice(0, 8)} · {formatDate(d.created_at)}</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">{d.reason}</div>
                    <p className="text-sm text-gray-500 line-clamp-2">{d.description}</p>
                    {d.admin_note && (
                      <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="text-xs font-bold text-blue-600 mb-1">Admin Response:</div>
                        <p className="text-sm text-blue-800">{d.admin_note}</p>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${statusColor(d.status)}`}>
                    {d.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File Dispute Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black text-gray-800 mb-5">File a Dispute</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Order *</label>
                  <select value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">Choose an order</option>
                    {orders.map((o: any) => (
                      <option key={o.id} value={o.id}>Order #{o.id?.slice(0, 8)} — {formatPrice(o.total_amount)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
                  <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">Select a reason</option>
                    {DISPUTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the issue in detail..." rows={4}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Evidence (optional)</label>
                  <div className={`border-2 border-dashed rounded-xl p-4 ${form.evidence ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <label className="cursor-pointer flex items-center gap-3">
                      <Upload className={`w-5 h-5 ${form.evidence ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-500">{form.evidence ? form.evidence.name : 'Upload photo/video evidence'}</span>
                      <input type="file" accept="image/*,video/*" className="hidden"
                        onChange={e => setForm(f => ({ ...f, evidence: e.target.files?.[0] || null }))} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600">Cancel</button>
                <button onClick={submitDispute} disabled={submitting}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
