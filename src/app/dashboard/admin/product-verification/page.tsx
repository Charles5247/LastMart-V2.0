'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Package, CheckCircle, XCircle, Eye, ArrowLeft, Loader, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AdminProductVerificationPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') fetchVerifications();
  }, [user, isLoading, filterStatus]);

  const fetchVerifications = async () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch(`/api/verification/products/admin${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setVerifications(data.data);
    setLoading(false);
  };

  const handleReview = async (verifyId: string, status: string) => {
    setProcessing(verifyId);
    try {
      const res = await fetch(`/api/verification/product/${verifyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status,
          review_notes: reviewNotes,
          authenticity_status: status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending',
          availability_status: status === 'approved' ? 'in_stock' : 'pending',
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Product ${status}`);
        setExpanded(null);
        setReviewNotes('');
        fetchVerifications();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-teal-500" />
            <h1 className="text-2xl font-black text-gray-900">Product Vetting</h1>
          </div>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          {['', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {verifications.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-3 text-gray-200" />
              <p>No product verifications found</p>
            </div>
          ) : verifications.map(pv => (
            <div key={pv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === pv.id ? null : pv.id)}>
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{pv.product_name}</p>
                  <p className="text-xs text-gray-400">{pv.store_name} · {pv.vendor_name} · {formatPrice(pv.price)} · {formatDate(pv.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    pv.status === 'approved' ? 'bg-green-100 text-green-700' :
                    pv.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{pv.status}</span>
                  {expanded === pv.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expanded === pv.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Availability Status</p>
                      <p className="text-sm font-medium text-gray-800">{pv.availability_status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Authenticity Status</p>
                      <p className="text-sm font-medium text-gray-800">{pv.authenticity_status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Disclaimer Accepted</p>
                      <p className="text-sm font-medium text-gray-800">{pv.disclaimer_accepted ? 'Yes ✓' : 'No'}</p>
                    </div>
                    {pv.expected_restock_date && (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Expected Restock</p>
                        <p className="text-sm font-medium text-gray-800">{pv.expected_restock_date}</p>
                      </div>
                    )}
                  </div>

                  {/* Document Links */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Stock Proof', url: pv.stock_proof_url },
                      { label: 'Brand Auth Letter', url: pv.brand_auth_doc_url },
                      { label: 'Supplier Invoice', url: pv.invoice_url },
                      { label: 'Lab Certificate', url: pv.lab_cert_url },
                      { label: 'Origin Document', url: pv.origin_doc_url },
                    ].map(d => (
                      <div key={d.label}>
                        <p className="text-xs text-gray-500 mb-0.5">{d.label}</p>
                        {d.url
                          ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-500 hover:underline flex items-center gap-1">View <Eye className="w-3 h-3" /></a>
                          : <p className="text-xs text-gray-400">Not provided</p>
                        }
                      </div>
                    ))}
                  </div>

                  {pv.disclaimer_text && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                      <strong>Vendor Disclaimer:</strong> {pv.disclaimer_text}
                    </div>
                  )}

                  {pv.status === 'pending' && (
                    <div className="space-y-3">
                      <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                        placeholder="Review notes for vendor..." rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                      <div className="flex gap-3">
                        <button onClick={() => handleReview(pv.id, 'rejected')} disabled={!!processing}
                          className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-xl text-sm font-bold hover:bg-red-200 disabled:opacity-50">
                          <XCircle className="w-4 h-4 inline mr-1" /> Reject
                        </button>
                        <button onClick={() => handleReview(pv.id, 'approved')} disabled={!!processing}
                          className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50">
                          {processing === pv.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : <><CheckCircle className="w-4 h-4 inline mr-1" /> Approve & List Product</>}
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
