'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Crown, CheckCircle, XCircle, Loader, ArrowLeft, TrendingUp, Star, Zap, AlertTriangle, Package, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AdminRankingsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [rankings, setRankings] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'applications' | 'recommendations'>('applications');
  const [filterStatus, setFilterStatus] = useState('pending_approval');
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') fetchData();
  }, [user, isLoading, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    const [rankRes, lamaRes] = await Promise.all([
      fetch(`/api/ranking/admin${filterStatus ? `?status=${filterStatus}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/ranking/lama-recommendations', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [rankData, lamaData] = await Promise.all([rankRes.json(), lamaRes.json()]);
    if (rankData.success) setRankings(rankData.data);
    if (lamaData.success) setRecommendations(lamaData.data.recommendations || []);
    setLoading(false);
  };

  const handleAction = async (rankId: string, status: string) => {
    setProcessing(rankId);
    try {
      const res = await fetch(`/api/ranking/admin/${rankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Ranking ${status}`);
        setNotes('');
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch { toast.error('Network error'); }
    setProcessing(null);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><Loader className="w-10 h-10 text-orange-500 animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Crown className="w-7 h-7 text-yellow-500" />
            <h1 className="text-2xl font-black text-gray-900">Rankings & Advertising</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {(['applications', 'recommendations'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === t ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {t === 'applications' ? <><Crown className="w-4 h-4" /> Applications</> : <><Zap className="w-4 h-4" /> LAMA Recommendations</>}
            </button>
          ))}
        </div>

        {activeTab === 'applications' && (
          <>
            {/* Status filter */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {['', 'pending_approval', 'pending_payment', 'active', 'expired', 'cancelled'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-orange-300'}`}>
                  {s || 'All'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {rankings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Crown className="w-16 h-16 mx-auto mb-3 text-gray-200" />
                  <p>No ranking applications found</p>
                </div>
              ) : rankings.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{r.badge_icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900">{r.store_name}</h3>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-sm text-gray-600">{r.package_name}</span>
                        {r.product_id && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Product: {r.product_name}</span>}
                      </div>
                      <p className="text-xs text-gray-400">
                        {r.vendor_user_name} · {r.vendor_email} · Applied {formatDate(r.created_at)}
                      </p>
                      {r.payment_reference && (
                        <p className="text-xs text-green-600 mt-1">💰 Payment ref: {r.payment_reference} · {formatPrice(r.amount_paid || r.package_price)}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
                      r.status === 'active' ? 'bg-green-100 text-green-700' :
                      r.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'pending_payment' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                      'bg-red-100 text-red-700'
                    }`}>{r.status.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>

                  {(r.status === 'pending_approval') && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes for vendor..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                      <div className="flex gap-3">
                        <button onClick={() => handleAction(r.id, 'rejected')} disabled={!!processing}
                          className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-xl text-sm font-bold hover:bg-red-200 disabled:opacity-50">
                          Reject
                        </button>
                        <button onClick={() => handleAction(r.id, 'active')} disabled={!!processing}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                          {processing === r.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '🚀 Activate Ranking'}
                        </button>
                      </div>
                    </div>
                  )}
                  {r.status === 'active' && r.end_date && (
                    <p className="text-xs text-green-600 mt-2">✅ Active until {new Date(r.end_date).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-5 border border-purple-100 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-purple-500" />
                <h3 className="font-bold text-gray-800">LAMA AI Ranking Recommendations</h3>
              </div>
              <p className="text-sm text-gray-600">These vendors and products are performing well and may benefit from ranking promotions. Based on last 30 days of platform activity.</p>
            </div>

            {recommendations.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Zap className="w-16 h-16 mx-auto mb-3 text-gray-200" />
                <p>No recommendations yet. Run more sales first!</p>
              </div>
            ) : recommendations.map((rec, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${rec.type === 'vendor_ranking' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  {rec.type === 'vendor_ranking' ? <Store className="w-6 h-6 text-orange-500" /> : <Package className="w-6 h-6 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{rec.entity_name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rec.type === 'vendor_ranking' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {rec.type === 'vendor_ranking' ? 'Vendor' : 'Product'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{rec.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">City: {rec.city} · LAMA Score: {rec.lama_score.toFixed(0)}/100</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-14 h-14 relative flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                      <circle cx="28" cy="28" r="22" fill="none" stroke="#f97316" strokeWidth="4"
                        strokeDasharray={`${(rec.lama_score / 100) * 138} 138`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-orange-500">{rec.lama_score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
