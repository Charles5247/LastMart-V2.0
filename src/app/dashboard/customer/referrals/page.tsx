'use client';
/**
 * ─── Customer Referral & Coupons Page ────────────────────────────────────────
 * Allows customers to:
 *   1. View their personal referral link + code
 *   2. See referral stats (who they referred, rewards earned)
 *   3. View all available coupon codes
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  Gift, Link2, Copy, Share2, Users, CheckCircle, Clock,
  ArrowLeft, Tag, Star, Loader, RefreshCw, ExternalLink
} from 'lucide-react';

export default function ReferralsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();

  const [stats,    setStats]    = useState<any>(null);
  const [coupons,  setCoupons]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'coupons'>('referrals');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchAll();
  }, [user, isLoading]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, couponsRes] = await Promise.all([
        fetch('/api/coupons/referral/stats', { headers }).then(r => r.json()),
        fetch('/api/coupons/my',             { headers }).then(r => r.json()),
      ]);
      if (statsRes.success)   setStats(statsRes.data);
      if (couponsRes.success) setCoupons(couponsRes.data);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  };

  const generateReferralLink = async () => {
    setGenerating(true);
    try {
      const res  = await fetch('/api/coupons/referral/generate', { method: 'POST', headers });
      const data = await res.json();
      if (data.success) { setStats((s: any) => ({ ...s, ...data.data })); toast.success('Referral link generated!'); }
      else toast.error(data.error);
    } catch { toast.error('Network error'); }
    setGenerating(false);
  };

  const copyText = async (text: string, label = 'Copied!') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Copy failed'); }
  };

  const share = async () => {
    const url = stats?.referral_url;
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join LastMart!',
          text: `Join LastMart using my referral link and get a 0.5% discount coupon! 🎁`,
          url,
        });
      } catch { /* cancelled */ }
    } else {
      copyText(url, 'Referral link copied!');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

  if (isLoading || loading) return (
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
      <div className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/dashboard/customer" className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Referrals & Coupons</h1>
              <p className="text-white/70 text-sm mt-0.5">Earn rewards by sharing LastMart with friends</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Referrals',  value: stats?.total_referrals || 0, icon: Users,        color: 'blue'   },
            { label: 'Completed',        value: stats?.completed        || 0, icon: CheckCircle,  color: 'green'  },
            { label: 'Pending',          value: stats?.pending          || 0, icon: Clock,        color: 'yellow' },
            { label: 'Available Coupons',value: coupons.length,               icon: Tag,          color: 'orange' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className={`w-8 h-8 bg-${s.color}-100 rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'referrals', label: 'My Referrals', icon: <Users size={14} /> },
            { key: 'coupons',   label: 'My Coupons',   icon: <Tag   size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── REFERRALS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'referrals' && (
          <div className="space-y-5">
            {/* Referral Link Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-green-500" /> Your Referral Link
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Share this link with friends. When they sign up, they get a <strong className="text-orange-600">0.5% discount coupon</strong> on their first order, and you earn referral credit!
              </p>

              {stats?.referral_url ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <input
                      readOnly
                      value={stats.referral_url}
                      className="input flex-1 text-xs bg-gray-50 text-gray-600"
                    />
                    <button
                      onClick={() => copyText(stats.referral_url, 'Referral link copied!')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                        copied ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      }`}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={share} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
                      <Share2 className="w-4 h-4" /> Share Link
                    </button>
                    <button
                      onClick={() => copyText(stats.referral_code, 'Referral code copied!')}
                      className="btn-secondary flex items-center gap-2 text-sm px-4 py-2.5"
                    >
                      <Copy className="w-4 h-4" /> Copy Code: {stats.referral_code}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={generateReferralLink}
                  disabled={generating}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {generating
                    ? <><Loader className="w-4 h-4 animate-spin" /> Generating...</>
                    : <><Gift className="w-4 h-4" /> Generate My Referral Link</>}
                </button>
              )}
            </div>

            {/* How it works */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-5 border border-green-100">
              <h3 className="font-bold text-green-800 mb-3">How Referrals Work</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Share your unique referral link or code with friends' },
                  { step: '2', text: 'Friend signs up using your link/code' },
                  { step: '3', text: 'They receive a 0.5% discount coupon automatically' },
                  { step: '4', text: 'Your referral is tracked and marked complete when they make a purchase' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <p className="text-sm text-green-700">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral history */}
            {stats?.referrals?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> People You Referred
                </h3>
                <div className="space-y-3">
                  {stats.referrals.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {r.referred_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.referred_name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">{formatDate(r.created_at)}</p>
                      </div>
                      {r.coupon_code && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {r.coupon_code}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COUPONS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} available</p>
              <button onClick={fetchAll} className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {coupons.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No coupons yet</p>
                <p className="text-gray-400 text-sm mt-1">Refer friends or check back later for promo codes!</p>
                <button onClick={() => setActiveTab('referrals')} className="btn-primary text-sm px-5 py-2.5 mt-4">
                  Get Referral Link
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coupons.map((c: any) => (
                  <div key={c.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${
                    c.my_uses > 0 ? 'opacity-60 border-gray-200' : 'border-orange-100'
                  }`}>
                    {/* Coupon header */}
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-black text-xl tracking-widest">{c.code}</p>
                        <p className="text-white/80 text-xs">
                          {c.type === 'percent' || c.type === 'referral'
                            ? `${c.value}% off`
                            : `₦${Number(c.value).toLocaleString()} off`}
                        </p>
                      </div>
                      <div className="text-4xl opacity-40 font-black text-white">%</div>
                    </div>
                    {/* Coupon details */}
                    <div className="px-5 py-3 flex items-center justify-between">
                      <div>
                        {c.description && <p className="text-xs text-gray-600 mb-1">{c.description}</p>}
                        {c.expires_at && (
                          <p className="text-xs text-gray-400">
                            Expires: {new Date(c.expires_at).toLocaleDateString()}
                          </p>
                        )}
                        {c.min_order > 0 && (
                          <p className="text-xs text-gray-400">Min order: ₦{Number(c.min_order).toLocaleString()}</p>
                        )}
                        {c.my_uses > 0 && (
                          <p className="text-xs text-red-500 font-medium mt-0.5">Already used</p>
                        )}
                      </div>
                      <button
                        onClick={() => copyText(c.code, `Coupon "${c.code}" copied!`)}
                        disabled={c.my_uses > 0}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                          c.my_uses > 0
                            ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                            : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                        }`}
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tip box */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-700 font-semibold mb-1">💡 How to use coupons</p>
              <p className="text-xs text-blue-600">
                Copy the coupon code and enter it at checkout. The discount will be applied automatically to your order total.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
