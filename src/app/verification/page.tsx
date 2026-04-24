'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import {
  Shield, CheckCircle, Clock, XCircle, Upload, User, Building, FileText,
  Camera, CreditCard, Phone, AlertTriangle, ChevronRight, Eye, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const ID_TYPES = [
  { value: 'national_id', label: 'National ID (NIN)' },
  { value: 'passport', label: 'International Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_card', label: "Voter's Card" },
];

const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation / PLC' },
];

export default function VerificationPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const isVendor = user?.role === 'vendor';

  const [form, setForm] = useState({
    // Common
    id_type: 'national_id',
    id_number: '',
    id_front_url: '',
    id_back_url: '',
    selfie_url: '',
    // Customer
    bvn: '',
    nin: '',
    // Vendor
    business_name: '',
    business_reg_number: '',
    tin: '',
    business_type: 'sole_proprietorship',
    business_address: '',
    cac_doc_url: '',
    tax_cert_url: '',
    utility_bill_url: '',
    director_id_url: '',
  });

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchKyc();
  }, [user, isLoading]);

  const fetchKyc = async () => {
    try {
      const res = await fetch('/api/verification/kyc', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setKyc(data.data);
        // Pre-fill form
        const k = data.data;
        setForm(prev => ({
          ...prev,
          id_type: k.id_type || 'national_id',
          id_number: k.id_number || '',
          bvn: k.bvn || '',
          nin: k.nin || '',
          business_name: k.business_name || '',
          business_reg_number: k.business_reg_number || '',
          tin: k.tin || '',
          business_type: k.business_type || 'sole_proprietorship',
          business_address: k.business_address || '',
        }));
      }
    } catch { }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.id_type || !form.id_number) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (isVendor && (!form.business_name || !form.business_reg_number || !form.tin)) {
      toast.error('Business name, registration number, and TIN are required for vendors');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/verification/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('KYC submitted successfully! Under review.');
        fetchKyc();
        setStep(1);
      } else {
        toast.error(data.error || 'Submission failed');
      }
    } catch {
      toast.error('Network error');
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      not_submitted: 'bg-gray-100 text-gray-600',
      pending: 'bg-amber-100 text-amber-700',
      under_review: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const icons: Record<string, React.ReactElement> = {
      not_submitted: <AlertTriangle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      under_review: <Eye className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
    };
    const labels: Record<string, string> = {
      not_submitted: 'Not Submitted',
      pending: 'Pending Review',
      under_review: 'Under Review',
      approved: 'Verified ✓',
      rejected: 'Rejected',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.not_submitted}`}>
        {icons[status] || icons.not_submitted}
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96">
        <Loader className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    </div>
  );

  const kycStatus = kyc?.status || 'not_submitted';
  const isApproved = kycStatus === 'approved';
  const canResubmit = kycStatus === 'rejected' || kycStatus === 'not_submitted';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isApproved ? 'bg-green-100' : 'bg-orange-100'}`}>
            <Shield className={`w-8 h-8 ${isApproved ? 'text-green-600' : 'text-orange-500'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {isVendor ? 'Business Verification (KYC)' : 'Identity Verification (KYC)'}
            </h1>
            <p className="text-gray-500 text-sm">Verify your {isVendor ? 'business' : 'identity'} to unlock full platform features</p>
          </div>
          <div className="ml-auto">{getStatusBadge(kycStatus)}</div>
        </div>

        {/* Status Card */}
        {kyc && (
          <div className={`rounded-2xl p-5 mb-6 border ${
            isApproved ? 'bg-green-50 border-green-200' :
            kycStatus === 'rejected' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {isApproved ? <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" /> :
               kycStatus === 'rejected' ? <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" /> :
               <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />}
              <div>
                <p className={`font-bold ${isApproved ? 'text-green-800' : kycStatus === 'rejected' ? 'text-red-800' : 'text-blue-800'}`}>
                  {isApproved ? 'Your account is fully verified!' :
                   kycStatus === 'rejected' ? 'Verification rejected — please resubmit' :
                   'Verification under review'}
                </p>
                <p className={`text-sm mt-1 ${isApproved ? 'text-green-600' : kycStatus === 'rejected' ? 'text-red-600' : 'text-blue-600'}`}>
                  {isApproved ? `Verified since ${new Date(kyc.reviewed_at).toLocaleDateString()}` :
                   kycStatus === 'rejected' ? `Reason: ${kyc.rejection_reason || 'Documents incomplete. Please resubmit.'}` :
                   `Submitted ${new Date(kyc.submitted_at).toLocaleDateString()} — usually takes 1-3 business days`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        {!isApproved && (
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Why verify your {isVendor ? 'business' : 'identity'}?</h3>
            <div className="grid grid-cols-2 gap-3">
              {(isVendor ? [
                { icon: '🏪', text: 'Store goes live on the marketplace' },
                { icon: '📦', text: 'List and sell products' },
                { icon: '💰', text: 'Receive payouts and withdrawals' },
                { icon: '⭐', text: 'Gain Verified Vendor badge' },
                { icon: '📈', text: 'Access ranking & advertising features' },
                { icon: '🛡️', text: 'Build customer trust and credibility' },
              ] : [
                { icon: '🛍️', text: 'Place orders above ₦50,000' },
                { icon: '💳', text: 'Access all payment methods' },
                { icon: '🔄', text: 'Request refunds and disputes' },
                { icon: '⭐', text: 'Verified Buyer badge' },
              ]).map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-lg">{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {(canResubmit || !kyc) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Step tabs */}
            <div className="flex border-b border-gray-100">
              {(isVendor ? ['Personal ID', 'Business Info', 'Documents'] : ['Identity', 'Documents']).map((tab, i) => (
                <button key={i} onClick={() => setStep(i + 1)}
                  className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                    step === i + 1 ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Personal Identity */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">ID Type *</label>
                    <select value={form.id_type} onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400">
                      {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">ID Number *</label>
                    <input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                      placeholder="Enter your ID number" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  {!isVendor && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">BVN (Bank Verification Number)</label>
                        <input value={form.bvn} onChange={e => setForm(f => ({ ...f, bvn: e.target.value }))}
                          placeholder="11-digit BVN" maxLength={11} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">NIN (National Identification Number)</label>
                        <input value={form.nin} onChange={e => setForm(f => ({ ...f, nin: e.target.value }))}
                          placeholder="11-digit NIN" maxLength={11} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                    </>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Document Upload Links</p>
                    <p className="text-xs text-gray-500">Please upload your documents to an image hosting service (e.g., Google Drive, Dropbox) and paste the shareable links below.</p>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">ID Front Photo URL</label>
                      <input value={form.id_front_url} onChange={e => setForm(f => ({ ...f, id_front_url: e.target.value }))}
                        placeholder="https://drive.google.com/..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">ID Back Photo URL</label>
                      <input value={form.id_back_url} onChange={e => setForm(f => ({ ...f, id_back_url: e.target.value }))}
                        placeholder="https://drive.google.com/..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Selfie Photo URL (holding your ID)</label>
                      <input value={form.selfie_url} onChange={e => setForm(f => ({ ...f, selfie_url: e.target.value }))}
                        placeholder="https://drive.google.com/..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-orange-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Business Info (vendors only) */}
              {step === 2 && isVendor && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Registered Business Name *</label>
                    <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                      placeholder="As it appears on CAC certificate" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">CAC Registration Number *</label>
                    <input value={form.business_reg_number} onChange={e => setForm(f => ({ ...f, business_reg_number: e.target.value }))}
                      placeholder="e.g., BN123456 or RC1234567" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tax Identification Number (TIN) *</label>
                    <input value={form.tin} onChange={e => setForm(f => ({ ...f, tin: e.target.value }))}
                      placeholder="Your TIN from FIRS" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Business Type *</label>
                    <select value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400">
                      {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Business Address *</label>
                    <textarea value={form.business_address} onChange={e => setForm(f => ({ ...f, business_address: e.target.value }))}
                      placeholder="Full registered business address" rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                  </div>
                </div>
              )}

              {/* Step 3 / Last Step: Documents */}
              {((step === 3 && isVendor) || (step === 2 && !isVendor)) && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 mb-2">
                    <p className="text-sm text-blue-700 font-medium">📎 Document Links</p>
                    <p className="text-xs text-blue-600 mt-1">Upload your documents to Google Drive or Dropbox and paste shareable links below. All documents must be clear and readable.</p>
                  </div>

                  {isVendor ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">CAC Certificate URL *</label>
                        <input value={form.cac_doc_url} onChange={e => setForm(f => ({ ...f, cac_doc_url: e.target.value }))}
                          placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Tax Clearance Certificate URL</label>
                        <input value={form.tax_cert_url} onChange={e => setForm(f => ({ ...f, tax_cert_url: e.target.value }))}
                          placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Utility Bill (Proof of Address) URL *</label>
                        <input value={form.utility_bill_url} onChange={e => setForm(f => ({ ...f, utility_bill_url: e.target.value }))}
                          placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Director's ID URL *</label>
                        <input value={form.director_id_url} onChange={e => setForm(f => ({ ...f, director_id_url: e.target.value }))}
                          placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-6">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Your identity documents have been entered in Step 1.</p>
                      <p className="mt-1">Click Submit to send for review.</p>
                    </div>
                  )}

                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <><Shield className="w-5 h-5" /><span>Submit for Verification</span></>}
                  </button>
                </div>
              )}

              {/* Navigation */}
              {((isVendor && step < 3) || (!isVendor && step < 2)) && (
                <div className="flex justify-end pt-2">
                  <button onClick={() => setStep(s => s + 1)}
                    className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-orange-600">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isApproved && (
          <div className="text-center py-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">You're Verified!</h2>
            <p className="text-gray-500 mb-6">Your {isVendor ? 'business' : 'identity'} has been verified. Enjoy full access to LastMart.</p>
            <button onClick={() => router.push(isVendor ? '/dashboard/vendor' : '/')}
              className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-8 py-3 rounded-xl font-bold">
              {isVendor ? 'Go to Dashboard' : 'Start Shopping'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
