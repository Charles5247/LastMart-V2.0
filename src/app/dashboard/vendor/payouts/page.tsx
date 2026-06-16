'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { DollarSign, ArrowLeft, Wallet, TrendingUp, Clock, CheckCircle, Plus, Building2, Edit2 } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const NIGERIAN_BANKS = ['Access Bank','GTBank','Zenith Bank','First Bank','UBA','Wema Bank','Opay','Palmpay','Kuda Bank','FCMB','Polaris Bank','Sterling Bank','Stanbic IBTC','Fidelity Bank','Union Bank','Keystone Bank','Providus Bank'];

export default function VendorPayoutsPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [payoutData, setPayoutData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'vendor') { router.push('/'); return; }
    if (user) fetchData();
  }, [user, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [payoutRes, historyRes] = await Promise.all([
        fetch('/api/vendors/payout-balance', { headers }),
        fetch('/api/vendors/payouts', { headers }),
      ]);
      const [p, h] = await Promise.all([payoutRes.json(), historyRes.json()]);
      if (p.success) { setPayoutData(p.data); setBankForm(b => ({ ...b, ...p.data?.bank_details })); }
      if (h.success) setPayouts(h.data || []);
    } catch {}
    setLoading(false);
  };

  const saveBankDetails = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
      toast.error('All fields required'); return;
    }
    setSavingBank(true);
    try {
      const res = await fetch('/api/vendors/bank-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bankForm),
      });
      const data = await res.json();
      if (data.success) { toast.success('Bank details saved!'); setShowBankSetup(false); fetchData(); }
      else toast.error(data.message || 'Failed');
    } catch { toast.error('Error saving bank details'); }
    setSavingBank(false);
  };

  const requestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5000) { toast.error('Minimum withdrawal is ₦5,000'); return; }
    if (amount > (payoutData?.available_balance || 0)) { toast.error('Insufficient balance'); return; }
    if (!payoutData?.bank_details?.account_number) { toast.error('Please set up bank details first'); setShowBankSetup(true); return; }
    setWithdrawing(true);
    try {
      const res = await fetch('/api/vendors/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Withdrawal request submitted! Processing within 24 hours.'); setShowWithdraw(false); setWithdrawAmount(''); fetchData(); }
      else toast.error(data.message || 'Failed');
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
          <Link href="/dashboard/vendor" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Payouts & Withdrawals</h1>
            <p className="text-gray-500 text-sm">Manage your earnings and bank account</p>
          </div>
        </div>

        {/* Escrow Explainer */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Escrow System:</strong> Payments are held in escrow until buyers confirm delivery. 
              Available balance is released 48 hours after confirmed delivery. Platform fee: 5%.
            </div>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Available Balance', value: formatPrice(payoutData?.available_balance || 0), icon: Wallet, color: 'bg-green-500', sub: 'Ready to withdraw' },
            { label: 'Escrow (Pending)', value: formatPrice(payoutData?.escrow_balance || 0), icon: Clock, color: 'bg-yellow-500', sub: 'Awaiting delivery confirm' },
            { label: 'Total Paid Out', value: formatPrice(payoutData?.total_paid || 0), icon: TrendingUp, color: 'bg-orange-500', sub: 'Lifetime withdrawals' },
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

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => setShowWithdraw(true)}
            disabled={(payoutData?.available_balance || 0) < 5000}
            className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-2xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" /> Request Withdrawal
          </button>
          <button onClick={() => setShowBankSetup(true)}
            className="flex items-center gap-2 border-2 border-gray-200 text-gray-700 font-bold py-3 px-5 rounded-2xl hover:bg-gray-50">
            <Building2 className="w-5 h-5" /> {payoutData?.bank_details?.account_number ? 'Update Bank' : 'Setup Bank'}
          </button>
        </div>

        {/* Bank Details Card */}
        {payoutData?.bank_details?.account_number && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-gray-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-orange-500" /> Bank Account</h3>
              <button onClick={() => setShowBankSetup(true)} className="text-orange-500 text-sm font-semibold flex items-center gap-1 hover:underline"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><div className="text-gray-400 text-xs">Bank</div><div className="font-semibold">{payoutData.bank_details.bank_name}</div></div>
              <div><div className="text-gray-400 text-xs">Account Number</div><div className="font-semibold font-mono">{payoutData.bank_details.account_number}</div></div>
              <div><div className="text-gray-400 text-xs">Account Name</div><div className="font-semibold">{payoutData.bank_details.account_name}</div></div>
            </div>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-black text-gray-800 mb-4">Payout History</h3>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No payouts yet</div>
          ) : (
            <div className="space-y-3">
              {payouts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <div>
                    <div className="font-bold text-sm">{formatPrice(p.amount)}</div>
                    <div className="text-xs text-gray-400">{formatDate(p.created_at)} · {p.bank_name}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    p.status === 'paid' ? 'bg-green-100 text-green-700' :
                    p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{p.status?.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Withdrawal Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-black text-gray-800 mb-2">Request Withdrawal</h3>
              <p className="text-gray-500 text-sm mb-5">Available: {formatPrice(payoutData?.available_balance || 0)}</p>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Amount (min ₦5,000)" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-orange-400 mb-4" />
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

        {/* Bank Setup Modal */}
        {showBankSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-black text-gray-800 mb-5">Bank Account Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                  <select value={bankForm.bank_name} onChange={e => setBankForm(b => ({ ...b, bank_name: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">Select bank</option>
                    {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                  <input value={bankForm.account_number} onChange={e => setBankForm(b => ({ ...b, account_number: e.target.value }))}
                    placeholder="10-digit account number" maxLength={10}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Name</label>
                  <input value={bankForm.account_name} onChange={e => setBankForm(b => ({ ...b, account_name: e.target.value }))}
                    placeholder="Account holder name"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowBankSetup(false)} className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-gray-600">Cancel</button>
                <button onClick={saveBankDetails} disabled={savingBank}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                  {savingBank ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
