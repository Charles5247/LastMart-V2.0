'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Upload, CheckCircle, Bike, FileText, Camera, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import BankVerifyInput from '@/components/ui/BankVerifyInput';

export default function RiderKYCPage() {
  const { user, token } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicle_type: 'motorcycle',
    vehicle_plate: '',
    license_number: '',
    nin: '',
  });
  const [bankVerified, setBankVerified] = useState<any>(null);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    gov_id: null, selfie: null, vehicle_reg: null, vehicle_photo: null,
  });

  const handleFileChange = (field: string, file: File | null) => {
    setFiles(f => ({ ...f, [field]: file }));
  };

  const handleSubmit = async () => {
    if (!bankVerified) { toast.error('Please verify your bank account first'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      formData.append('bank_name', bankVerified.bank_name);
      formData.append('account_number', bankVerified.account_number);
      formData.append('account_name', bankVerified.account_name);
      Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v); });
      const res = await fetch('/api/riders/kyc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('KYC submitted! We\'ll review within 24–48 hours.');
        router.push('/rider/dashboard');
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch {
      toast.error('Error submitting KYC');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bike className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Rider KYC Verification</h1>
          <p className="text-gray-500 mt-2">Complete verification to start earning with LastMart</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{s}</div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 rounded ${step > s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mb-6 px-2">
          <span>Personal Info</span><span>Documents</span><span>Bank Details</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Step 1 - Personal */}
          {step === 1 && (
            <div>
              <h2 className="font-black text-gray-800 mb-5 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" /> Personal & Vehicle Info
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['motorcycle', 'bicycle', 'car'].map(v => (
                      <button key={v} onClick={() => setForm(f => ({ ...f, vehicle_type: v }))}
                        className={`py-3 rounded-xl border-2 font-semibold text-sm capitalize transition-all ${form.vehicle_type === v ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {v === 'motorcycle' ? '🏍️ Motorcycle' : v === 'bicycle' ? '🚲 Bicycle' : '🚗 Car'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Plate Number</label>
                  <input value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))}
                    placeholder="e.g. ABC-123-XY" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Driver's License Number</label>
                  <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                    placeholder="License number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NIN (National ID Number)</label>
                  <input value={form.nin} onChange={e => setForm(f => ({ ...f, nin: e.target.value }))}
                    placeholder="11-digit NIN" maxLength={11} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>
              <button onClick={() => setStep(2)}
                disabled={!form.vehicle_plate || !form.nin}
                className="w-full mt-6 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 - Documents */}
          {step === 2 && (
            <div>
              <h2 className="font-black text-gray-800 mb-5 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" /> Upload Documents
              </h2>
              <div className="space-y-4">
                {[
                  { key: 'gov_id', label: 'Government-issued ID', desc: 'NIN slip, Voter\'s card, or Passport' },
                  { key: 'selfie', label: 'Selfie with ID', desc: 'Clear photo holding your ID document' },
                  { key: 'vehicle_reg', label: 'Vehicle Registration', desc: 'Vehicle registration document' },
                  { key: 'vehicle_photo', label: 'Vehicle Photo', desc: 'Clear photo of your vehicle' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className={`border-2 border-dashed rounded-xl p-4 transition-colors ${files[key] ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <label className="cursor-pointer flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${files[key] ? 'bg-green-100' : 'bg-orange-50'}`}>
                        {files[key] ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Upload className="w-5 h-5 text-orange-400" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400">{files[key] ? files[key]!.name : desc}</div>
                      </div>
                      <input type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => handleFileChange(key, e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">← Back</button>
                <button onClick={() => setStep(3)}
                  disabled={!files.gov_id || !files.selfie}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Bank Details */}
          {step === 3 && (
            <div>
              <h2 className="font-black text-gray-800 mb-5 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" /> Bank Account Details
              </h2>
              <p className="text-sm text-gray-500 mb-5">Your earnings will be paid to this account</p>
              <BankVerifyInput
                token={token}
                onVerified={data => setBankVerified(data)}
                required
              />
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">← Back</button>
                <button onClick={handleSubmit}
                  disabled={submitting || !bankVerified}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</> : '✅ Submit KYC'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
