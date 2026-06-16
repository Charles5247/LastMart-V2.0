'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { AlertCircle, ArrowLeft, CheckCircle, XCircle, Eye, MessageSquare, DollarSign, Search } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminDisputesPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDispute, setActiveDispute] = useState<any | null>(null);
  const [resolution, setResolution] = useState({ decision: '', admin_note: '', refund_amount: '' });
  const [resolving, setResolving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user) fetchDisputes();
  }, [user, isLoading]);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes?status=${filter !== 'all' ? filter : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDisputes(data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (user?.role === 'admin') fetchDisputes(); }, [filter]);

  const resolveDispute = async () => {
    if (!resolution.decision || !resolution.admin_note) { toast.error('Please provide decision and note'); return; }
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/disputes/${activeDispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(resolution),
      });
      const data = await res.json();
      if (data.success) { toast.success('Dispute resolved!'); setActiveDispute(null); fetchDisputes(); }
      else toast.error(data.message || 'Failed');
    } catch { toast.error('Error resolving dispute'); }
    setResolving(false);
  };

  const filteredDisputes = disputes.filter(d =>
    d.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.order_id?.includes(search) || d.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => ({
    pending: 'bg-yellow-100 text-yellow-700',
    investigating: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    escalated: 'bg-purple-100 text-purple-700',
  }[s] || 'bg-gray-100 text-gray-600');

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/admin" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" /> Dispute Resolution
            </h1>
            <p className="text-gray-500 text-sm">{disputes.filter(d => d.status === 'pending').length} pending disputes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', count: disputes.filter(d => d.status === 'pending').length, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Investigating', count: disputes.filter(d => d.status === 'investigating').length, color: 'text-blue-600 bg-blue-50' },
            { label: 'Resolved', count: disputes.filter(d => d.status === 'resolved').length, color: 'text-green-600 bg-green-50' },
            { label: 'Total', count: disputes.length, color: 'text-gray-700 bg-gray-50' },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl p-4 ${s.color}`}>
              <div className="text-2xl font-black">{s.count}</div>
              <div className="text-sm font-medium">{s.label} Disputes</div>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by buyer, order, reason..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'investigating', 'resolved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Disputes Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Dispute ID', 'Buyer', 'Order', 'Reason', 'Amount', 'Status', 'Filed', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDisputes.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">#{d.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{d.buyer_name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">#{d.order_id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-32 truncate">{d.reason}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{formatPrice(d.order_amount || 0)}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(d.status)}`}>{d.status?.toUpperCase()}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setActiveDispute(d); setResolution({ decision: '', admin_note: '', refund_amount: '' }); }}
                        className="flex items-center gap-1 text-orange-500 hover:text-orange-700 text-sm font-semibold">
                        <Eye className="w-4 h-4" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDisputes.length === 0 && (
              <div className="text-center py-12 text-gray-400">No disputes found</div>
            )}
          </div>
        </div>

        {/* Dispute Detail Modal */}
        {activeDispute && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black text-gray-800 mb-5">Dispute #{activeDispute.id?.slice(0, 8)}</h3>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 rounded-xl p-4">
                <div><div className="text-xs text-gray-400">Buyer</div><div className="font-semibold text-sm">{activeDispute.buyer_name}</div></div>
                <div><div className="text-xs text-gray-400">Vendor</div><div className="font-semibold text-sm">{activeDispute.vendor_name}</div></div>
                <div><div className="text-xs text-gray-400">Order</div><div className="font-semibold text-sm font-mono">#{activeDispute.order_id?.slice(0, 8)}</div></div>
                <div><div className="text-xs text-gray-400">Amount</div><div className="font-semibold text-sm">{formatPrice(activeDispute.order_amount || 0)}</div></div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">Reason</div>
                <div className="font-semibold text-sm text-orange-600">{activeDispute.reason}</div>
              </div>
              <div className="mb-5 bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Description</div>
                <p className="text-sm text-gray-700">{activeDispute.description}</p>
              </div>

              {/* Evidence */}
              {activeDispute.evidence_url && (
                <div className="mb-5">
                  <div className="text-xs text-gray-400 mb-2">Evidence</div>
                  <a href={activeDispute.evidence_url} target="_blank" rel="noreferrer" className="text-orange-500 text-sm hover:underline">View Evidence →</a>
                </div>
              )}

              {/* Resolution Form (only if not resolved) */}
              {!['resolved', 'rejected'].includes(activeDispute.status) && (
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h4 className="font-black text-gray-800">Resolution</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: 'refund_buyer', label: '💰 Refund Buyer', sub: 'Full or partial refund to buyer' },
                      { v: 'favor_vendor', label: '✅ Favor Vendor', sub: 'Order proceeds to vendor' },
                      { v: 'partial_refund', label: '⚖️ Partial Refund', sub: 'Split refund' },
                      { v: 'rejected', label: '❌ Reject Dispute', sub: 'Invalid claim' },
                    ].map(({ v, label, sub }) => (
                      <button key={v} onClick={() => setResolution(r => ({ ...r, decision: v }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${resolution.decision === v ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-sm font-bold">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                      </button>
                    ))}
                  </div>
                  {resolution.decision === 'partial_refund' && (
                    <input type="number" value={resolution.refund_amount} onChange={e => setResolution(r => ({ ...r, refund_amount: e.target.value }))}
                      placeholder="Refund amount (₦)" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  )}
                  <textarea value={resolution.admin_note} onChange={e => setResolution(r => ({ ...r, admin_note: e.target.value }))}
                    placeholder="Explain your decision to the buyer and vendor..." rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setActiveDispute(null)} className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600">Close</button>
                {!['resolved', 'rejected'].includes(activeDispute.status) && (
                  <button onClick={resolveDispute} disabled={resolving || !resolution.decision || !resolution.admin_note}
                    className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                    {resolving ? 'Resolving...' : 'Submit Resolution'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
