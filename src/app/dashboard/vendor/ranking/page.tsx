'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import {
  TrendingUp, Star, Crown, Zap, CheckCircle, Clock, XCircle,
  Package, Store, Loader, ArrowLeft, CreditCard, AlertTriangle, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';

export default function VendorRankingPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();

  const [packages, setPackages] = useState<any[]>([]);
  const [myRankings, setMyRankings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<'vendor' | 'product'>('vendor');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'vendor') { router.push('/dashboard/vendor'); return; }
    if (user?.role === 'vendor') {
      fetchData();
    }
  }, [user, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    const [pkgRes, myRes, prodRes] = await Promise.all([
      fetch('/api/ranking/packages', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/ranking/my', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/vendors/me/analytics', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [pkgData, myData, prodData] = await Promise.all([pkgRes.json(), myRes.json(), prodRes.json()]);
    if (pkgData.success) setPackages(pkgData.data);
    if (myData.success) setMyRankings(myData.data);
    if (prodData.success) setProducts(prodData.data?.topProducts || []);
    setLoading(false);
  };

  const handleApply = async () => {
    if (!selectedPkg) return;
    if (activeTab === 'product' && !selectedProduct) {
      toast.error('Please select a product'); return;
    }
    if (!paymentRef) {
      toast.error('Please enter a payment reference'); return;
    }

    setApplying(true);
    try {
      const res = await fetch('/api/ranking/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          package_id: selectedPkg.id,
          product_id: activeTab === 'product' ? selectedProduct : undefined,
          payment_reference: paymentRef,
          amount_paid: selectedPkg.price,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Application submitted! Admin will review and activate your ranking.');
        setShowApply(false);
        setSelectedPkg(null);
        setPaymentRef('');
        setSelectedProduct('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to submit');
      }
    } catch {
      toast.error('Network error');
    }
    setApplying(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending_approval: 'bg-amber-100 text-amber-700',
      pending_payment: 'bg-blue-100 text-blue-700',
      expired: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const vendorPackages = packages.filter(p => p.type === 'vendor_ranking');
  const productPackages = packages.filter(p => p.type === 'product_ranking');
  const displayPackages = activeTab === 'vendor' ? vendorPackages : productPackages;

  const priorityIcon = (level: number) => {
    if (level >= 4) return '💎';
    if (level >= 3) return '🥇';
    if (level >= 2) return '🥈';
    return '🥉';
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><Loader className="w-10 h-10 text-orange-500 animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <Link href="/dashboard/vendor" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">Ranking & Advertising</h1>
          <p className="text-white/80">Boost your store and products to reach more customers</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* My Active Rankings */}
        {myRankings.filter(r => r.status === 'active').length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" /> Active Rankings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRankings.filter(r => r.status === 'active').map(r => (
                <div key={r.id} className="flex items-center gap-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl p-4 border border-orange-100">
                  <div className="text-3xl">{r.badge_icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{r.package_name}</p>
                    <p className="text-sm text-gray-500">{r.product_id ? `Product: ${r.product_name}` : 'Store-wide ranking'}</p>
                    <p className="text-xs text-green-600 mt-1">
                      Active until {r.end_date ? new Date(r.end_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">LIVE</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('vendor')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'vendor' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'}`}>
            <Store className="w-4 h-4" /> Store Ranking
          </button>
          <button onClick={() => setActiveTab('product')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'product' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'}`}>
            <Package className="w-4 h-4" /> Product Boost
          </button>
        </div>

        {/* Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {displayPackages.map(pkg => (
            <div key={pkg.id}
              onClick={() => { setSelectedPkg(pkg); setShowApply(true); }}
              className={`bg-white rounded-2xl shadow-sm border cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 p-5 ${
                pkg.priority_level >= 4 ? 'border-purple-200 ring-2 ring-purple-200' :
                pkg.priority_level >= 3 ? 'border-yellow-200' :
                'border-gray-100'
              }`}>
              {pkg.priority_level >= 3 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                  ⭐ Most Popular
                </div>
              )}
              <div className="text-4xl mb-3">{pkg.badge_icon}</div>
              <h3 className="text-lg font-black text-gray-900 mb-1">{pkg.name}</h3>
              <p className="text-2xl font-black text-orange-500 mb-1">{formatPrice(pkg.price)}</p>
              <p className="text-sm text-gray-500 mb-4">{pkg.duration_days} days</p>
              <ul className="space-y-2 mb-5">
                {pkg.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-2.5 rounded-xl text-sm font-bold">
                Apply Now
              </button>
            </div>
          ))}
        </div>

        {/* Application History */}
        {myRankings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Application History</h2>
            <div className="space-y-3">
              {myRankings.map(r => (
                <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-2xl">{r.badge_icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{r.package_name}</p>
                    <p className="text-xs text-gray-500">
                      {r.product_id ? `Product Boost: ${r.product_name}` : 'Store Ranking'} ·{' '}
                      Applied {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getStatusColor(r.status)}`}>
                    {r.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {r.amount_paid && (
                    <span className="text-sm font-medium text-gray-600">{formatPrice(r.amount_paid)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApply && selectedPkg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-gray-900 mb-1">Apply for {selectedPkg.name}</h3>
            <p className="text-gray-500 text-sm mb-5">Duration: {selectedPkg.duration_days} days · Cost: <strong className="text-orange-500">{formatPrice(selectedPkg.price)}</strong></p>

            {activeTab === 'product' && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Select Product to Boost *</label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400">
                  <option value="">Choose a product...</option>
                  {products.map((p: any) => (
                    <option key={p.id || p.name} value={p.id || ''}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" /> Payment Instructions
              </p>
              <ol className="text-xs text-amber-700 space-y-1 list-decimal ml-4">
                <li>Transfer <strong>{formatPrice(selectedPkg.price)}</strong> to:<br />
                  <strong>LastMart Advertising</strong><br />
                  Bank: First Bank Nigeria<br />
                  Acc No: 1234567890
                </li>
                <li>Copy your bank transaction reference number</li>
                <li>Paste the reference below and submit</li>
              </ol>
            </div>

            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Payment Reference *</label>
              <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g., FBFT123456789" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
              <p className="text-xs text-gray-400 mt-1">This is the reference from your bank transfer. Admin will verify before activation.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowApply(false); setSelectedPkg(null); setPaymentRef(''); }}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleApply} disabled={applying}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                {applying ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
