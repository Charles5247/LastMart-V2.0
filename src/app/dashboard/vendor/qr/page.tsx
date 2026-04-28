'use client';
/**
 * ─── Vendor QR Code & Share Link Page ────────────────────────────────────────
 * Allows vendors to generate a QR code and shareable URL for their store.
 * Customers who visit via the share link get a 0.5% referral coupon.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  QrCode, Link2, Copy, RefreshCw, Share2, Download,
  ArrowLeft, Eye, ExternalLink, CheckCircle, Loader,
  Users, Store, BarChart2
} from 'lucide-react';

export default function VendorQRPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied]   = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) {
      router.push('/auth/login'); return;
    }
    if (vendor?.id) fetchQR();
  }, [user, vendor, isLoading]);

  const fetchQR = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/qr/vendor/${vendor.id}`, { headers });
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.error || 'Failed to load QR');
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  const refreshToken = async () => {
    if (!vendor?.id) return;
    setRefreshing(true);
    try {
      const res  = await fetch(`/api/qr/vendor/${vendor.id}/refresh`, { method: 'POST', headers });
      const json = await res.json();
      if (json.success) {
        setData((d: any) => ({ ...d, ...json.data }));
        toast.success('Share link refreshed!');
      } else toast.error(json.error);
    } catch { toast.error('Network error'); }
    setRefreshing(false);
  };

  const copyLink = async () => {
    if (!data?.share_url) return;
    try {
      await navigator.clipboard.writeText(data.share_url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Copy failed'); }
  };

  const shareLink = async () => {
    if (!data?.share_url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vendor?.store_name} – LastMart`,
          text: `Check out my store on LastMart! Get a special discount when you shop via my link.`,
          url: data.share_url,
        });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  const downloadQR = () => {
    if (!svgRef.current || !data?.qr_svg) return;
    const svgData  = data.qr_svg;
    const blob     = new Blob([svgData], { type: 'image/svg+xml' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `${vendor?.store_name || 'store'}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('QR code downloaded!');
  };

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
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/dashboard/vendor" className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <QrCode className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Store QR Code & Share Link</h1>
              <p className="text-white/70 text-sm mt-0.5">Share your store with customers – they get a 0.5% discount coupon!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats strip */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Scans',    value: data.scans || 0,              icon: Eye,      color: 'blue'   },
              { label: 'Products',       value: (vendor as any)?.total_products || '–', icon: Store,    color: 'orange' },
              { label: 'Store Rating',   value: Number(vendor?.rating || 0).toFixed(1), icon: BarChart2, color: 'green' },
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code panel */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-orange-500" /> QR Code
            </h2>
            {data?.qr_svg ? (
              <>
                <div
                  ref={svgRef}
                  className="inline-block bg-white p-4 rounded-2xl shadow-inner border border-gray-100 mb-4"
                  dangerouslySetInnerHTML={{ __html: data.qr_svg }}
                />
                <p className="text-xs text-gray-400 mb-4">
                  Scan to visit <strong>{vendor?.store_name}</strong>
                </p>
                <button
                  onClick={downloadQR}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" /> Download QR (SVG)
                </button>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-300">
                <QrCode className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Share link panel */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-500" /> Share Link
            </h2>

            {data?.share_url && (
              <div className="mb-5">
                <label className="label mb-2">Your Store URL</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={data.share_url}
                    className="input flex-1 text-xs bg-gray-50 text-gray-700"
                  />
                  <button
                    onClick={copyLink}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    }`}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={shareLink}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Share2 className="w-4 h-4" /> Share Store Link
              </button>
              <Link
                href={`/vendor/${vendor?.id}`}
                target="_blank"
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Preview Your Store
              </Link>
              <button
                onClick={refreshToken}
                disabled={refreshing}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors py-2"
              >
                {refreshing
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Regenerate Share Token
              </button>
            </div>

            {/* Info box */}
            <div className="mt-5 bg-orange-50 rounded-xl p-4 border border-orange-100">
              <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4" /> How it works
              </h4>
              <ul className="text-xs text-orange-700 space-y-1.5">
                <li>• Share your store URL or QR code with customers</li>
                <li>• When a customer visits via your link, they receive a <strong>0.5% discount coupon</strong></li>
                <li>• The coupon is applied automatically at checkout on their first order</li>
                <li>• Each customer can only receive the coupon once per vendor</li>
                <li>• Regenerating the token invalidates the old link</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Share templates */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-500" /> Ready-to-Share Messages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                platform: 'WhatsApp',
                icon: '💬',
                text: `🛍️ Shop at *${vendor?.store_name}* on LastMart!\n\nGet quality products delivered to your door.\n👉 ${data?.share_url || ''}\n\n✨ Use this link for a special discount on your first order!`,
              },
              {
                platform: 'SMS / BBM',
                icon: '📱',
                text: `Check out ${vendor?.store_name} on LastMart! Shop now: ${data?.share_url || ''} – Get a discount on your first order!`,
              },
              {
                platform: 'Email',
                icon: '📧',
                text: `Hi! I wanted to share my store with you.\n\nVisit ${vendor?.store_name} on LastMart: ${data?.share_url || ''}\n\nYou'll get a special discount coupon just for visiting via this link. Happy shopping!`,
              },
              {
                platform: 'Social Media',
                icon: '📣',
                text: `🔥 Shop fresh products at ${vendor?.store_name} on @LastMart! Fast delivery, great prices. Visit my store: ${data?.share_url || ''} #LastMart #LocalMarketplace`,
              },
            ].map(t => (
              <div key={t.platform} className="border border-gray-100 rounded-xl p-4 hover:border-orange-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{t.icon} {t.platform}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(t.text);
                      toast.success(`${t.platform} message copied!`);
                    }}
                    className="text-xs text-orange-500 hover:text-orange-700 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 whitespace-pre-line line-clamp-3">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
