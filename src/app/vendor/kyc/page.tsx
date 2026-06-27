'use client';
export const dynamic = 'force-dynamic';
/**
 * Vendor KYC & Profile Photos Page
 * - Upload business logo OR passport photograph (used as store profile picture)
 * - Upload storefront photograph (store, supermarket, table stand, home/hostel)
 * - Upload CAC document (optional) and government ID
 * - Bank account details with live Paystack account name verification
 */

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/components/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BankVerifyInput from '@/components/ui/BankVerifyInput';
import toast from 'react-hot-toast';
import {
  Upload, CheckCircle, Store, User, FileText, Camera,
  Building2, Home, ShoppingBag, Loader, AlertCircle, Eye, X
} from 'lucide-react';
import Link from 'next/link';

const STOREFRONT_TYPES = [
  { value: 'store',        label: 'Physical Store',        icon: Store,       desc: 'Dedicated retail shop/boutique' },
  { value: 'supermarket',  label: 'Supermarket',           icon: ShoppingBag, desc: 'Full-scale grocery/goods store' },
  { value: 'table_stand',  label: 'Table / Street Stand',  icon: User,        desc: 'Market stall or street table' },
  { value: 'home_hostel',  label: 'Home / Hostel / School', icon: Home,        desc: 'Selling from residence or school' },
  { value: 'online_only',  label: 'Online Only',           icon: Building2,   desc: 'No physical location' },
];

interface FilePreview { file: File; preview: string; }

function FileUploadBox({
  label, accept, preview, onChange, hint, required,
}: {
  label: string; accept: string; preview: string | null;
  onChange: (f: File) => void; hint?: string; required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all
          ${preview ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'}`}
        onClick={() => ref.current?.click()}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="preview" className="max-h-36 mx-auto rounded-xl object-contain" />
            <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
              <CheckCircle size={14} />
            </div>
          </div>
        ) : (
          <div className="py-4">
            <Upload className="mx-auto text-gray-300 mb-2" size={28} />
            <p className="text-sm text-gray-500">Click to upload from device</p>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
          </div>
        )}
        <input
          ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }}
        />
      </div>
    </div>
  );
}

export default function VendorKycPage() {
  const { user, token } = useApp();

  // Photo states
  const [logoFile,       setLogoFile]       = useState<FilePreview | null>(null);
  const [storefrontFile, setStorefrontFile] = useState<FilePreview | null>(null);
  const [cacFile,        setCacFile]        = useState<FilePreview | null>(null);
  const [idFile,         setIdFile]         = useState<FilePreview | null>(null);
  const [storefrontType, setStorefrontType] = useState('store');
  const [photoType,      setPhotoType]      = useState<'logo' | 'passport'>('logo');

  // Bank fields
  const [bankVerified, setBankVerified]     = useState<any>(null);
  const [idType,       setIdType]           = useState('nin');
  const [idNumber,     setIdNumber]         = useState('');

  // UI state
  const [kycStatus,    setKycStatus]        = useState<any>(null);
  const [loading,      setLoading]          = useState(false);
  const [pageLoading,  setPageLoading]      = useState(true);
  const [activeTab,    setActiveTab]        = useState<'photos' | 'bank' | 'docs'>('photos');

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const filePreview = (file: File): string => URL.createObjectURL(file);

  useEffect(() => {
    if (!token) { setPageLoading(false); return; }
    fetch('/api/vendor-kyc/status', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setKycStatus(d.data); })
      .finally(() => setPageLoading(false));
  }, [token]); // eslint-disable-line

  /* ── Upload logo / passport ─────────────────────────────────────────── */
  const uploadLogo = async () => {
    if (!logoFile) return toast.error('Please select a photo');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('photo', logoFile.file);
      fd.append('photo_type', photoType);
      const res = await fetch('/api/vendor-kyc/logo', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile photo uploaded!');
        setKycStatus((s: any) => ({ ...s, has_logo: true }));
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch { toast.error('Upload failed'); }
    setLoading(false);
  };

  /* ── Upload storefront ──────────────────────────────────────────────── */
  const uploadStorefront = async () => {
    if (!storefrontFile) return toast.error('Please select a storefront photo');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('storefront_photo', storefrontFile.file);
      fd.append('storefront_type', storefrontType);
      const res = await fetch('/api/vendor-kyc/storefront', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success('Storefront photo uploaded!');
        setKycStatus((s: any) => ({ ...s, has_storefront: true }));
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch { toast.error('Upload failed'); }
    setLoading(false);
  };

  /* ── Submit bank details ────────────────────────────────────────────── */
  const saveBankDetails = async () => {
    if (!bankVerified) return toast.error('Please verify your bank account first');
    setLoading(true);
    try {
      const res = await fetch('/api/vendors/bank-details', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name:      bankVerified.bank_name,
          bank_code:      bankVerified.bank_code,
          account_number: bankVerified.account_number,
          account_name:   bankVerified.account_name,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('Bank details saved!');
      else toast.error(data.error || 'Failed to save');
    } catch { toast.error('Failed to save bank details'); }
    setLoading(false);
  };

  /* ── Submit full KYC ────────────────────────────────────────────────── */
  const submitKyc = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      if (logoFile) fd.append(photoType === 'passport' ? 'passport_photo' : 'business_logo', logoFile.file);
      if (storefrontFile) fd.append('storefront_photo', storefrontFile.file);
      if (cacFile) fd.append('cac_doc', cacFile.file);
      if (idFile)  fd.append('id_doc', idFile.file);
      fd.append('storefront_type', storefrontType);
      fd.append('id_type', idType);
      fd.append('id_number', idNumber);
      const res = await fetch('/api/vendor-kyc/submit', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success('KYC documents submitted! Under review.');
        setKycStatus((s: any) => ({ ...s, kyc: { status: 'pending' } }));
      } else {
        toast.error(data.error || 'Submission failed');
      }
    } catch { toast.error('Submission failed'); }
    setLoading(false);
  };

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="animate-spin text-orange-500" size={32} />
    </div>
  );

  if (!user || user.role !== 'vendor') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="mx-auto text-orange-400 mb-3" size={40} />
        <p className="text-gray-600">Vendor access required</p>
        <Link href="/auth/login" className="text-orange-600 hover:underline text-sm mt-2 inline-block">Sign in</Link>
      </div>
    </div>
  );

  const kycStatusBadge = kycStatus?.kyc?.status;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Vendor Verification</h1>
                <p className="text-gray-500 text-sm mt-1">Upload profile photos, storefront, and documents to build buyer trust</p>
              </div>
              {kycStatusBadge && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold
                  ${kycStatusBadge === 'approved' ? 'bg-green-100 text-green-700'
                  : kycStatusBadge === 'rejected' ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'}`}>
                  KYC: {kycStatusBadge}
                </span>
              )}
            </div>

            {/* Completion badges */}
            <div className="flex gap-3 mt-4">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                ${kycStatus?.has_logo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {kycStatus?.has_logo ? <CheckCircle size={12} /> : <Camera size={12} />}
                Profile Photo
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                ${kycStatus?.has_storefront ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {kycStatus?.has_storefront ? <CheckCircle size={12} /> : <Store size={12} />}
                Storefront
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                ${kycStatusBadge === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {kycStatusBadge === 'approved' ? <CheckCircle size={12} /> : <FileText size={12} />}
                Documents
              </div>
            </div>
          </div>

          {kycStatusBadge === 'rejected' && kycStatus?.kyc?.admin_note && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">KYC Rejected</p>
                  <p className="text-sm text-red-600 mt-1">{kycStatus.kyc.admin_note}</p>
                  <p className="text-xs text-red-500 mt-1">Please re-submit with corrected documents below.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm mb-6">
            {([
              { id: 'photos', label: 'Profile Photos', icon: Camera },
              { id: 'bank',   label: 'Bank Account',   icon: Building2 },
              { id: 'docs',   label: 'Documents',       icon: FileText },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon size={15} /> {tab.label}
              </button>
            ))}
          </div>

          {/* ── PHOTOS TAB ────────────────────────────────────────────── */}
          {activeTab === 'photos' && (
            <div className="space-y-6">

              {/* Business logo / passport */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Camera size={18} className="text-orange-500" />
                  Business Profile Photo
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  This photo appears on your store profile and product listings. Upload your business logo or a passport/ID photo.
                </p>

                {/* Photo type toggle */}
                <div className="flex gap-3 mb-5">
                  {[
                    { value: 'logo',     label: 'Business Logo' },
                    { value: 'passport', label: 'Passport / ID Photo' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPhotoType(opt.value as any)}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all
                        ${photoType === opt.value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <FileUploadBox
                  label={photoType === 'logo' ? 'Business Logo (PNG/JPG)' : 'Passport Photograph'}
                  accept="image/*"
                  preview={logoFile?.preview || null}
                  hint={photoType === 'logo' ? 'Recommended: square, min 200×200px' : 'Clear, well-lit face photo on plain background'}
                  onChange={f => setLogoFile({ file: f, preview: filePreview(f) })}
                  required
                />

                <button
                  onClick={uploadLogo}
                  disabled={loading || !logoFile}
                  className="mt-4 btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
                  Upload Profile Photo
                </button>
              </div>

              {/* Storefront photo */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Store size={18} className="text-orange-500" />
                  Storefront Photograph
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  A photo of where you operate from. This builds trust with buyers.
                </p>

                {/* Storefront type */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {STOREFRONT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setStorefrontType(t.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all
                        ${storefrontType === t.value ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <t.icon size={18} className={storefrontType === t.value ? 'text-orange-500' : 'text-gray-400'} />
                      <p className={`text-xs font-semibold mt-1.5 ${storefrontType === t.value ? 'text-orange-700' : 'text-gray-700'}`}>
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 leading-tight mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>

                <FileUploadBox
                  label="Storefront Photo"
                  accept="image/*"
                  preview={storefrontFile?.preview || null}
                  hint="Take a clear photo showing your business location / setup"
                  onChange={f => setStorefrontFile({ file: f, preview: filePreview(f) })}
                  required
                />

                <button
                  onClick={uploadStorefront}
                  disabled={loading || !storefrontFile}
                  className="mt-4 btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
                  Upload Storefront Photo
                </button>
              </div>
            </div>
          )}

          {/* ── BANK TAB ──────────────────────────────────────────────── */}
          {activeTab === 'bank' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Building2 size={18} className="text-orange-500" /> Bank Account Details
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Your payout account. We verify the account name automatically using Paystack.
              </p>

              <BankVerifyInput
                token={token}
                onVerified={data => {
                  setBankVerified(data);
                  toast.success(`Account verified: ${data.account_name}`);
                }}
                required
              />

              {bankVerified && (
                <button
                  onClick={saveBankDetails}
                  disabled={loading}
                  className="mt-5 btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  Save Bank Details
                </button>
              )}

              <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>Account verification uses Paystack's bank resolution API. Your details are encrypted and only used for payouts.</span>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS TAB ─────────────────────────────────────────── */}
          {activeTab === 'docs' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText size={18} className="text-orange-500" /> Identity & Business Documents
                </h2>
                <p className="text-sm text-gray-500">Upload supporting documents to complete full KYC verification.</p>
              </div>

              {/* ID type + number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={idType}
                    onChange={e => setIdType(e.target.value)}
                  >
                    <option value="nin">NIN (National ID)</option>
                    <option value="bvn">BVN</option>
                    <option value="drivers_license">Driver&apos;s Licence</option>
                    <option value="voters_card">Voter&apos;s Card</option>
                    <option value="intl_passport">International Passport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <input
                    type="text"
                    placeholder="Enter ID number"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Government ID upload */}
              <FileUploadBox
                label="Government-Issued ID (photo or scan)"
                accept="image/*,.pdf"
                preview={idFile?.preview || null}
                hint="NIN slip, Driver's licence, Voter's card, or International passport"
                onChange={f => setIdFile({ file: f, preview: filePreview(f) })}
              />

              {/* CAC upload */}
              <FileUploadBox
                label="CAC Certificate (optional — for registered businesses)"
                accept="image/*,.pdf"
                preview={cacFile?.preview || null}
                hint="Business registration certificate (CAC-IT, CAC-BN, etc.)"
                onChange={f => setCacFile({ file: f, preview: filePreview(f) })}
              />

              <button
                onClick={submitKyc}
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                Submit All Documents for Review
              </button>

              <p className="text-xs text-gray-400 text-center">
                Documents are reviewed within 24–48 hours. You will receive a notification when approved.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
