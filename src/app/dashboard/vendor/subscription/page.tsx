'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Crown, ArrowLeft, CheckCircle, Zap, Star, Shield, TrendingUp, Package, MessageCircle, BarChart2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

const TIERS = [
  {
    id: 'basic', name: 'Basic', price: 0, period: 'Free forever',
    color: 'border-gray-200', badge: 'bg-gray-100 text-gray-700',
    icon: Package, iconBg: 'bg-gray-100',
    features: ['Up to 20 products', 'Basic analytics', 'Standard listing', 'Email support', '0% commission on first 10 orders'],
    limits: { products: 20, photos: 3, analytics: 'basic' },
  },
  {
    id: 'starter', name: 'Starter', price: 5000, period: '/month',
    color: 'border-blue-300', badge: 'bg-blue-100 text-blue-700',
    icon: Star, iconBg: 'bg-blue-100',
    features: ['Up to 100 products', 'Enhanced analytics', 'Priority listing', 'Chat support', 'Promotional tools', 'QR code marketing', 'Coupon creation'],
    limits: { products: 100, photos: 8, analytics: 'enhanced' },
  },
  {
    id: 'growth', name: 'Growth', price: 15000, period: '/month',
    color: 'border-orange-400', badge: 'bg-orange-100 text-orange-700',
    icon: TrendingUp, iconBg: 'bg-orange-100',
    popular: true,
    features: ['Unlimited products', 'Advanced analytics', 'Featured listing', '24/7 priority support', 'LAMA AI insights', 'Bulk upload', 'Custom store page', 'Buyer messaging', 'Subscription products'],
    limits: { products: -1, photos: 15, analytics: 'advanced' },
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 50000, period: '/month',
    color: 'border-purple-400', badge: 'bg-purple-100 text-purple-700',
    icon: Crown, iconBg: 'bg-purple-100',
    features: ['Everything in Growth', 'Dedicated account manager', 'Custom domain', 'API access', 'White-label options', 'Multi-city operations', 'Platform co-branding', 'SLA guarantee', 'Fraud protection priority'],
    limits: { products: -1, photos: -1, analytics: 'enterprise' },
  },
];

export default function SubscriptionPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'vendor') { router.push('/'); return; }
    if (user) fetchSubscription();
  }, [user, isLoading]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendors/subscription', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCurrentTier(data.data?.tier || 'basic');
    } catch {}
    setLoading(false);
  };

  const upgradeTier = async (tierId: string) => {
    if (tierId === currentTier) return;
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return;
    setUpgrading(tierId);
    try {
      const res = await fetch('/api/vendors/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: tierId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.payment_url) { window.location.href = data.data.payment_url; }
        else { setCurrentTier(tierId); toast.success(`Upgraded to ${tier.name} plan!`); }
      } else toast.error(data.message || 'Upgrade failed');
    } catch { toast.error('Error processing upgrade'); }
    setUpgrading(null);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/vendor" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Subscription Plans</h1>
            <p className="text-gray-500 text-sm">Choose the plan that fits your business</p>
          </div>
        </div>

        {/* Current Plan Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-5 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">Current Plan</div>
              <div className="text-2xl font-black capitalize">{currentTier}</div>
              <div className="text-sm opacity-80 mt-1">
                {currentTier === 'basic' ? 'Free Forever' : `Active subscription`}
              </div>
            </div>
            <Crown className="w-12 h-12 opacity-30" />
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <div key={tier.id}
              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                tier.color
              } ${currentTier === tier.id ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}>
              {tier.popular && (
                <div className="bg-orange-500 text-white text-center text-xs font-bold py-1.5">⭐ MOST POPULAR</div>
              )}
              {currentTier === tier.id && !tier.popular && (
                <div className="bg-green-500 text-white text-center text-xs font-bold py-1.5">✅ CURRENT PLAN</div>
              )}
              <div className="p-5">
                <div className={`w-12 h-12 ${tier.iconBg} rounded-2xl flex items-center justify-center mb-3`}>
                  <tier.icon className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">{tier.name}</h3>
                <div className="mb-4">
                  {tier.price === 0 ? (
                    <span className="text-2xl font-black text-gray-900">Free</span>
                  ) : (
                    <div>
                      <span className="text-2xl font-black text-gray-900">{formatPrice(tier.price)}</span>
                      <span className="text-gray-500 text-sm">{tier.period}</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-5">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {currentTier === tier.id ? (
                  <div className="w-full py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-bold text-center">
                    ✓ Active Plan
                  </div>
                ) : (
                  <button onClick={() => upgradeTier(tier.id)}
                    disabled={upgrading === tier.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      tier.popular
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-orange-400 hover:text-orange-600'
                    } disabled:opacity-50`}>
                    {upgrading === tier.id ? 'Processing...' : tier.price === 0 ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison Note */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-black text-gray-800 mb-4">All plans include:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: 'Buyer Protection', desc: 'Escrow on every order' },
              { icon: BarChart2, label: 'Basic Analytics', desc: 'Track sales & visits' },
              { icon: Zap, label: 'Instant Notifications', desc: 'Real-time updates' },
              { icon: MessageCircle, label: 'Customer Reviews', desc: 'Build store reputation' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{f.label}</div>
                  <div className="text-xs text-gray-400">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
