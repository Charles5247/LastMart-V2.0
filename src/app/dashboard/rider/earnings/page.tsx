'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { DollarSign, ArrowLeft, Wallet, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RiderEarningsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [earnings, setEarnings] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'rider') { router.push('/'); return; }
    fetchEarnings();
  }, [user, isLoading]);

  const fetchEarnings = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [earningsRes, withdrawalsRes] = await Promise.all([
        fetch('/api/riders/earnings', { headers }),
        fetch('/api/riders/withdrawals', { headers }),
      ]);
      const [e, w] = await Promise.all([earningsRes.json(), withdrawalsRes.json()]);
      if (e.success) setEarnings(e.data);
      if (w.success) setWithdrawals(w.data || []);
    } catch {}
    setLoading(false);
  };

  const requestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1000) { toast.error('Minimum withdrawal is ₦1,000'); return; }
    if (amount > (earnings?.available_balance || 0)) { toast.error('Insufficient balance'); return; }
    setWithdrawing(true);
    try {
      const res = await fetch('/api/riders/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Withdrawal request submitted!'); setShowWithdraw(false); setWithdrawAmount(''); fetchEarnings(); }
      else toast.error(data.message || 'Withdrawal failed');
    } catch { toast.error('Error requesting withdrawal'); }
    setWithdrawing(false);
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
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/rider" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-black text-gray-900">Earnings & Payouts</h1>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Available Balance', value: formatPrice(earnings?.available_balance || 0), icon: Wallet, color: 'bg-green-500', sub: 'Ready to withdraw' },
            { label: 'Pending Balance', value: formatPrice(earnings?.pending_balance || 0), icon: Clock, color: 'bg-yellow-500', sub: 'Orders in transit' },
            { label: 'Total Earned', value: formatPrice(earnings?.total_earned || 0), icon: TrendingUp, color: 'bg-orange-500', sub: 'All time earnings' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-black text-gray-900">{c.value}</div>
              <div className="text-sm text-gray-500 mt-1">{c.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Withdraw Button */}
        {(earnings?.available_balance || 0) >= 1000 && (
          <button onClick={() => setShowWithdraw(true)}
            className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl mb-6 hover:bg-orange-600 transition-colors text-lg">
            💸 Request Withdrawal
          </button>
        )}

        {/* Withdrawal Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-black text-gray-800 mb-2">Request Withdrawal</h3>
              <p className="text-gray-500 text-sm mb-5">Available: {formatPrice(earnings?.available_balance || 0)}</p>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Amount (min ₦1,000)" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-orange-400 mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setShowWithdraw(false)} className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600">Cancel</button>
                <button onClick={requestWithdrawal} disabled={withdrawing}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                  {withdrawing ? 'Processing...' : 'Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-black text-gray-800 mb-4">Withdrawal History</h3>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No withdrawals yet</div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <div>
                    <div className="font-bold text-sm">{formatPrice(w.amount)}</div>
                    <div className="text-xs text-gray-400">{formatDate(w.created_at)}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    w.status === 'paid' ? 'bg-green-100 text-green-700' :
                    w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{w.status?.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
