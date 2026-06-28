'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import {
  Shield, CheckCircle, Clock, XCircle, Upload, User, Building, FileText,
  Camera, CreditCard, Phone, AlertTriangle, ChevronRight, Eye, Loader, X
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

/* ── Reusable file-upload box ───────────────────────────────────────── */
interface FileBoxProps {
  label: string;
  required?: boolean;
  accept?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  hint?: string;
}

function FileBox({ label, required, accept = 'image/*,.pdf', file, onChange, hint }: FileBoxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all
          ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'}`}
      >
        {file ? (
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-700 truncate">{file.name}</p>
              <p className="text-xs text-green-600">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(null); if (ref.current) ref.current.value = ''; }}
              className="p-1 rounded-full hover:bg-green-200 text-green-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-3 gap-2 text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Click to upload from device</p>
              {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, PDF · max 5 MB</p>
            </div>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => onChange(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const isVendor = user?.role === 'vendor';

  /* ── Text fields ───────────────────────────────────────────────────── */
  const [form, setForm] = useState({
    id_type: 'national_id',
    id_number: '',
    bvn: '',
    nin: '',
    business_name: '',
    business_reg_number: '',
    tin: '',
    business_type: 'sole_proprietorship',
    business_address: '',
  });

  /* ── File fields ───────────────────────────────────────────────────── */
  const [files, setFiles] = useState<{ [k: string]: File | null }>({
    id_front:     null,
    id_back:      null,
    selfie:       null,
    cac_doc:      null,
    tax_cert:     null,
    utility_bill: null,
    director_id:  null,
  });
  const setFile = (key: string, file: File | null) =>
    setFiles(prev => ({ ...prev, [key]: file }));

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
        const k = data.data;
        setForm(prev => ({
          ...prev,
          id_type:              k.id_type              || 'national_id',
          id_number:            k.id_number            || '',
          bvn:                  k.bvn                  || '',
          nin:                  k.nin                  || '',
          business_name:        k.business_name        || '',
          business_reg_number:  k.business_reg_number  || '',
          tin:                  k.tin                  || '',
          business_type:        k.business_type        || 'sole_proprietorship',
          business_address:     k.business_address     || '',
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
      /* Build multipart FormData so files are sent as actual uploads */
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, v]) => { if (v) fd.append(k, v); });

      const res = await fetch('/api/verification/kyc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },   // NO Content-Type — let browser set boundary
        body: fd,
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
      pending:       'bg-amber-100 text-amber-700',
      under_review:  'bg-blue-100 text-blue-700',
      approved:      'bg-green-100 text-green-700',
      rejected:      'bg-red-100 text-red-700',
    };
    const icons: Record<string, React.ReactElement> = {
      not_submitted: <AlertTriangle className="w-4 h-4" />,
      pending:       <Clock        className="w-4 h-4" />,
      under_review:  <Eye          className="w-4 h-4" />,
      approved:      <CheckCircle  className="w-4 h-4" />,
      rejected:      <XCircle      className="w-4 h-4" />,
    };
    const labels: Record<string, string> = {
      not_submitted: 'Not Submitted',
      pending:       'Pending Review',
      under_review:  'Under Review',
      approved:      'Verified ✓',
      rejected:      'Rejected',
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

  const kycStatus  = kyc?.status || 'not_submitted';
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
            isApproved        ? 'bg-green-50 border-green-200' :
            kycStatus === 'rejected' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {isApproved        ? <CheckCircle className="w-6 h-6 text-green-600 shrink-0" /> :
               kycStatus === 'rejected' ? <XCircle    className="w-6 h-6 text-red-600 shrink-0"   /> :
                                          <Clock      className="w-6 h-6 text-blue-600 shrink-0"  />}
              <div>
                <p className={`font-bold ${isApproved ? 'text-green-800' : kycStatus === 'rejected' ? 'text-red-800' : 'text-blue-800'}`}>
                  {isApproved ? 'Your account is fully verified!' :
                   kycStatus === 'rejected' ? 'Verification rejected — please resubmit' :
                   'Verification under review'}
                </p>
                <p className={`text-sm mt-1 ${isApproved ? 'text-green-600' : kycStatus === 'rejected' ? 'text-red-600' : 'text-blue-600'}`}>
                  {isApproved ? `Verified since ${new Date(kyc.reviewed_at).toLocaleDateString()}` :
                   kycStatus === 'rejected' ? `Reason: ${kyc.rejection_reason || 'Documents incomplete. Please resubmit.'}` :
                   `Submitted ${new Date(kyc.submitted_at).toLocaleDateString()} — usually takes 1–3 business days`}
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
              {(isVendor
                ? ['Personal ID', 'Business Info', 'Documents']
                : ['Identity', 'Documents']
              ).map((tab, i) => (
                <button key={i} onClick={() => setStep(i + 1)}
                  className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                    step === i + 1
                      ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">

              {/* ── Step 1: Personal Identity ─────────────────────────── */}
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
                      placeholder="Enter your ID number"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>

                  {!isVendor && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">BVN (Bank Verification Number)</label>
                        <input value={form.bvn} onChange={e => setForm(f => ({ ...f, bvn: e.target.value }))}
                          placeholder="11-digit BVN" maxLength={11}
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">NIN (National Identification Number)</label>
                        <input value={form.nin} onChange={e => setForm(f => ({ ...f, nin: e.target.value }))}
                          placeholder="11-digit NIN" maxLength={11}
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                    </>
                  )}

                  {/* ── Document Uploads (Step 1) ──────────────────────── */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-0.5">Upload Identity Documents</p>
                      <p className="text-xs text-gray-500">Upload clear photos or scans directly from your device.</p>
                    </div>
                    <FileBox
                      label="ID Front Photo"
                      required
                      file={files.id_front}
                      onChange={f => setFile('id_front', f)}
                      hint="Front side of your selected ID"
                    />
                    <FileBox
                      label="ID Back Photo"
                      file={files.id_back}
                      onChange={f => setFile('id_back', f)}
                      hint="Back side of your selected ID"
                    />
                    <FileBox
                      label="Selfie Holding Your ID"
                      required
                      accept="image/*"
                      file={files.selfie}
                      onChange={f => setFile('selfie', f)}
                      hint="Clear face photo while holding your open ID document"
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: Business Info (vendors only) ──────────────── */}
              {step === 2 && isVendor && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Registered Business Name *</label>
                    <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                      placeholder="As it appears on CAC certificate"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">CAC Registration Number *</label>
                    <input value={form.business_reg_number} onChange={e => setForm(f => ({ ...f, business_reg_number: e.target.value }))}
                      placeholder="e.g., BN123456 or RC1234567"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tax Identification Number (TIN) *</label>
                    <input value={form.tin} onChange={e => setForm(f => ({ ...f, tin: e.target.value }))}
                      placeholder="Your TIN from FIRS"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
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
                      placeholder="Full registered business address" rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                  </div>
                </div>
              )}

              {/* ── Step 3 / Last Step: Business Documents ────────────── */}
              {((step === 3 && isVendor) || (step === 2 && !isVendor)) && (
                <div className="space-y-4">
                  <div className="bg-orange-50 rounded-xl p-4 mb-2">
                    <p className="text-sm text-orange-700 font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Upload Documents from Your Device
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Select files directly — images (JPG, PNG) or PDFs. All documents must be clear and fully readable.
                    </p>
                  </div>

                  {isVendor ? (
                    <>
                      <FileBox
                        label="CAC Certificate"
                        required
                        accept="image/*,.pdf"
                        file={files.cac_doc}
                        onChange={f => setFile('cac_doc', f)}
                        hint="Business registration certificate (CAC-IT, CAC-BN, etc.)"
                      />
                      <FileBox
                        label="Tax Clearance Certificate"
                        accept="image/*,.pdf"
                        file={files.tax_cert}
                        onChange={f => setFile('tax_cert', f)}
                        hint="Most recent tax clearance from FIRS (optional)"
                      />
                      <FileBox
                        label="Utility Bill — Proof of Address"
                        required
                        accept="image/*,.pdf"
                        file={files.utility_bill}
                        onChange={f => setFile('utility_bill', f)}
                        hint="Electricity, water, or internet bill showing business address"
                      />
                      <FileBox
                        label="Director's Government-Issued ID"
                        required
                        accept="image/*,.pdf"
                        file={files.director_id}
                        onChange={f => setFile('director_id', f)}
                        hint="NIN slip, passport, driver's licence, or voter's card of director"
                      />
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-6">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Your identity documents have been uploaded in Step 1.</p>
                      <p className="mt-1">Click Submit to send for review.</p>
                    </div>
                  )}

                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting
                      ? <Loader className="w-5 h-5 animate-spin" />
                      : <><Shield className="w-5 h-5" /><span>Submit for Verification</span></>}
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
            <p className="text-gray-500 mb-6">
              Your {isVendor ? 'business' : 'identity'} has been verified. Enjoy full access to LastMart.
            </p>
            <button onClick={() => router.push(isVendor ? '/vendor/dashboard' : '/')}
              className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-8 py-3 rounded-xl font-bold">
              {isVendor ? 'Go to Dashboard' : 'Start Shopping'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
