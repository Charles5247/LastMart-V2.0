'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Shield, CheckCircle, XCircle, Clock, Eye, ArrowLeft, User, Building, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

export default function AdminKYCPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [kycs, setKycs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterType, setFilterType] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') fetchKycs();
  }, [user, isLoading, filterStatus, filterType]);

  const fetchKycs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterType) params.set('type', filterType);
    const res = await fetch(`/api/verification/kyc/admin?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setKycs(data.data);
    setLoading(false);
  };

  const handleReview = async (kycId: string, status: string) => {
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Please provide a rejection reason'); return;
    }
    setProcessing(kycId);
    try {
      const res = await fetch(`/api/verification/kyc/${kycId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, rejection_reason: rejectionReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`KYC ${status} successfully`);
        setExpanded(null);
        setRejectionReason('');
        fetchKycs();
      } else {
        toast.error(data.error);
      }
    } catch { toast.error('Network error'); }
    setProcessing(null);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><Loader className="w-10 h-10 text-orange-500 animate-spin" /></div>
    </div>
  );

  const statusIcon: Record<string, React.ReactElement> = {
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    under_review: <Eye className="w-4 h-4 text-blue-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-500" />
            <h1 className="text-2xl font-black text-gray-900">KYC Verifications</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {['', 'pending', 'under_review', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {s || 'All'} {s && `(${kycs.filter(k => k.status === s).length})`}
            </button>
          ))}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-orange-400 ml-auto">
            <option value="">All Types</option>
            <option value="customer_kyc">Customer KYC</option>
            <option value="vendor_kyc">Vendor KYC</option>
          </select>
        </div>

        {/* KYC List */}
        <div className="space-y-3">
          {kycs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Shield className="w-16 h-16 mx-auto mb-3 text-gray-200" />
              <p>No KYC submissions found</p>
            </div>
          ) : kycs.map(kyc => (
            <div key={kyc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === kyc.id ? null : kyc.id)}>
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {kyc.type === 'vendor_kyc' ? <Building className="w-5 h-5 text-orange-500" /> : <User className="w-5 h-5 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{kyc.user_name}</p>
                  <p className="text-xs text-gray-400">{kyc.user_email} · {kyc.type === 'vendor_kyc' ? '🏪 Vendor' : '👤 Customer'} · Submitted {formatDate(kyc.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${
                    kyc.status === 'approved' ? 'bg-green-100 text-green-700' :
                    kyc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    kyc.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {statusIcon[kyc.status]}{kyc.status}
                  </span>
                  {expanded === kyc.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expanded === kyc.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {kyc.type === 'vendor_kyc' ? (
                      <>
                        <Field label="Business Name" value={kyc.business_name} />
                        <Field label="CAC Reg Number" value={kyc.business_reg_number} />
                        <Field label="TIN" value={kyc.tin} />
                        <Field label="Business Type" value={kyc.business_type} />
                        <Field label="Business Address" value={kyc.business_address} className="col-span-2" />
                        <DocLink label="CAC Certificate" url={kyc.cac_doc_url} />
                        <DocLink label="Tax Certificate" url={kyc.tax_cert_url} />
                        <DocLink label="Utility Bill" url={kyc.utility_bill_url} />
                        <DocLink label="Director's ID" url={kyc.director_id_url} />
                      </>
                    ) : (
                      <>
                        <Field label="BVN" value={kyc.bvn} />
                        <Field label="NIN" value={kyc.nin} />
                        <Field label="ID Type" value={kyc.id_type} />
                        <Field label="ID Number" value={kyc.id_number} />
                        <DocLink label="ID Front" url={kyc.id_front_url} />
                        <DocLink label="ID Back" url={kyc.id_back_url} />
                        <DocLink label="Selfie" url={kyc.selfie_url} />
                      </>
                    )}
                  </div>

                  {kyc.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                      <strong>Rejection reason:</strong> {kyc.rejection_reason}
                    </div>
                  )}

                  {(kyc.status === 'pending' || kyc.status === 'under_review') && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Rejection Reason (if rejecting)</label>
                        <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                          placeholder="Explain reason for rejection..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleReview(kyc.id, 'under_review')} disabled={!!processing}
                          className="flex-1 bg-blue-100 text-blue-700 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-200 disabled:opacity-50">
                          Mark Under Review
                        </button>
                        <button onClick={() => handleReview(kyc.id, 'rejected')} disabled={!!processing}
                          className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-xl text-sm font-bold hover:bg-red-200 disabled:opacity-50">
                          Reject
                        </button>
                        <button onClick={() => handleReview(kyc.id, 'approved')} disabled={!!processing}
                          className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50">
                          {processing === kyc.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Approve ✓'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className = '' }: { label: string, value: string, className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function DocLink({ label, url }: { label: string, url: string }) {
  if (!url) return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-gray-400">Not provided</p></div>;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-500 hover:underline flex items-center gap-1">
        View Document <Eye className="w-3 h-3" />
      </a>
    </div>
  );
}
