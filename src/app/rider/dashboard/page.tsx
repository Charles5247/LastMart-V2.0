'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import {
  Bike, MapPin, Package, DollarSign, Star, Bell, CheckCircle,
  Clock, Navigation, Phone, Camera, Upload, ToggleLeft, ToggleRight,
  TrendingUp, ArrowRight, AlertCircle, User, Shield, Wallet, Award
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RiderStats {
  total_deliveries: number;
  completed_today: number;
  active_delivery: any;
  pending_assignments: any[];
  total_earned: number;
  today_earned: number;
  rating: number;
  total_ratings: number;
  acceptance_rate: number;
  completion_rate: number;
}

export default function RiderDashboard() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'rider') { router.push('/'); return; }
    if (user?.role === 'rider') {
      fetchRiderData();
    }
  }, [user, isLoading]);

  const fetchRiderData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, statsRes, deliveriesRes] = await Promise.all([
        fetch('/api/riders/profile', { headers }),
        fetch('/api/riders/stats', { headers }),
        fetch('/api/riders/deliveries?limit=10', { headers }),
      ]);
      const [profileData, statsData, deliveriesData] = await Promise.all([
        profileRes.json(), statsRes.json(), deliveriesRes.json()
      ]);
      if (profileData.success) {
        setRiderProfile(profileData.data);
        setIsAvailable(profileData.data?.is_available || false);
        setKycStatus(profileData.data?.kyc_status || 'none');
      }
      if (statsData.success) setStats(statsData.data);
      if (deliveriesData.success) setDeliveries(deliveriesData.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const toggleAvailability = async () => {
    setTogglingAvailability(true);
    try {
      const res = await fetch('/api/riders/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_available: !isAvailable }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAvailable(!isAvailable);
        toast.success(isAvailable ? 'You are now offline' : 'You are now online — ready for deliveries!');
      }
    } catch {
      toast.error('Failed to update availability');
    }
    setTogglingAvailability(false);
  };

  const acceptDelivery = async (deliveryId: string) => {
    try {
      const res = await fetch(`/api/riders/deliveries/${deliveryId}/accept`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { toast.success('Delivery accepted!'); fetchRiderData(); }
      else toast.error(data.message || 'Failed to accept');
    } catch { toast.error('Error accepting delivery'); }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      const res = await fetch(`/api/riders/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Status updated to ${status}`); fetchRiderData(); }
      else toast.error(data.message || 'Failed to update');
    } catch { toast.error('Error updating status'); }
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  // KYC not submitted
  if (kycStatus === 'none' || kycStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50"><Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-3">
              {kycStatus === 'rejected' ? 'KYC Rejected — Resubmit' : 'Complete Rider KYC'}
            </h2>
            <p className="text-gray-500 mb-8">
              {kycStatus === 'rejected'
                ? 'Your KYC was rejected. Please resubmit with correct documents.'
                : 'Before you can start delivering, we need to verify your identity and vehicle.'}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
              {['Government ID (NIN/Passport/Driver\'s License)', 'Vehicle registration document', 'Selfie with ID', 'Vehicle photo'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/rider/kyc" className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors">
              <Upload className="w-5 h-5" /> Start KYC Verification
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // KYC pending
  if (kycStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50"><Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-3">KYC Under Review</h2>
            <p className="text-gray-500 mb-4">Your documents are being reviewed by our team. This usually takes 24–48 hours.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
              📧 We'll notify you via email once your account is approved.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Rider Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your deliveries and earnings</p>
          </div>
          {/* Availability Toggle */}
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 cursor-pointer transition-all ${isAvailable ? 'bg-green-50 border-green-400' : 'bg-gray-100 border-gray-300'}`}
            onClick={!togglingAvailability ? toggleAvailability : undefined}>
            {isAvailable
              ? <ToggleRight className="w-8 h-8 text-green-500" />
              : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            <div>
              <div className={`font-bold text-sm ${isAvailable ? 'text-green-700' : 'text-gray-600'}`}>
                {togglingAvailability ? 'Updating...' : isAvailable ? '🟢 Online' : '⚫ Offline'}
              </div>
              <div className="text-xs text-gray-400">{isAvailable ? 'Ready for orders' : 'Go online to receive orders'}</div>
            </div>
          </div>
        </div>

        {/* Active Delivery Alert */}
        {stats?.active_delivery && (
          <div className="bg-orange-500 text-white rounded-2xl p-5 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <Navigation className="w-6 h-6 animate-pulse" />
              <span className="font-black text-lg">Active Delivery</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="opacity-75">Order ID</div><div className="font-bold">#{stats.active_delivery.order_id?.slice(0,8)}</div></div>
              <div><div className="opacity-75">Pickup</div><div className="font-bold">{stats.active_delivery.vendor_address || 'Vendor location'}</div></div>
              <div><div className="opacity-75">Delivery</div><div className="font-bold">{stats.active_delivery.delivery_address || 'Customer location'}</div></div>
              <div><div className="opacity-75">Amount</div><div className="font-bold">{formatPrice(stats.active_delivery.rider_fee || 0)}</div></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => updateDeliveryStatus(stats.active_delivery.id, 'picked_up')}
                className="flex-1 bg-white text-orange-600 font-bold py-2 rounded-xl hover:bg-orange-50 transition-colors text-sm">
                ✅ Confirm Pickup
              </button>
              <button onClick={() => updateDeliveryStatus(stats.active_delivery.id, 'delivered')}
                className="flex-1 bg-white text-green-600 font-bold py-2 rounded-xl hover:bg-green-50 transition-colors text-sm">
                🏁 Confirm Delivery
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Today\'s Earnings', value: formatPrice(stats?.today_earned || 0), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Earnings', value: formatPrice(stats?.total_earned || 0), icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Completed Today', value: stats?.completed_today || 0, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Rating', value: `${(stats?.rating || 0).toFixed(1)} ⭐`, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Performance */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Acceptance Rate</div>
            <div className="text-2xl font-black text-gray-900">{stats?.acceptance_rate || 0}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${stats?.acceptance_rate || 0}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Completion Rate</div>
            <div className="text-2xl font-black text-gray-900">{stats?.completion_rate || 0}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats?.completion_rate || 0}%` }} />
            </div>
          </div>
        </div>

        {/* Pending Assignments */}
        {(stats?.pending_assignments?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" /> New Delivery Requests
            </h3>
            <div className="space-y-3">
              {stats?.pending_assignments?.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-800">Order #{d.order_id?.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500 mt-1">📍 {d.vendor_area} → {d.delivery_area}</div>
                    <div className="text-xs text-green-600 font-bold mt-1">Earn: {formatPrice(d.rider_fee || 500)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptDelivery(d.id)}
                      className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600">
                      Accept
                    </button>
                    <button className="bg-gray-100 text-gray-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-200">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Deliveries */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" /> Recent Deliveries
            </h3>
            <Link href="/rider/deliveries" className="text-orange-500 text-sm font-semibold flex items-center gap-1 hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {deliveries.length === 0 ? (
            <div className="text-center py-12">
              <Bike className="w-16 h-16 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No deliveries yet</p>
              <p className="text-gray-300 text-sm">Go online and accept your first delivery!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <div>
                    <div className="font-bold text-sm text-gray-800">#{d.order_id?.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500">{formatDate(d.created_at)}</div>
                  </div>
                  <div className="text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      d.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      d.status === 'picked_up' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{d.status?.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="font-black text-green-600">{formatPrice(d.rider_fee || 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/rider/earnings', label: 'Earnings & Payouts', icon: Wallet, color: 'bg-green-500' },
            { href: '/rider/deliveries', label: 'All Deliveries', icon: Package, color: 'bg-blue-500' },
            { href: '/rider/profile', label: 'My Profile', icon: User, color: 'bg-purple-500' },
            { href: '/rider/kyc', label: 'KYC Documents', icon: Shield, color: 'bg-orange-500' },
          ].map((item, i) => (
            <Link key={i} href={item.href}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-shadow text-center group">
              <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-500">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
