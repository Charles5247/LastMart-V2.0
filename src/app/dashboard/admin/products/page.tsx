'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import {
  Package, Search, CheckCircle, XCircle, Star, ArrowLeft, Loader,
  Eye, ToggleLeft, ToggleRight, Crown, Shield, AlertTriangle, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AdminProductsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
    if (user?.role === 'admin') fetchProducts();
  }, [user, isLoading, statusFilter, verifyFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter !== 'all') params.set('is_active', statusFilter === 'active' ? '1' : '0');
    if (verifyFilter !== 'all') params.set('verification_status', verifyFilter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/products?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  };

  const updateProduct = async (productId: string, updates: Record<string, any>) => {
    setUpdating(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Product updated');
        fetchProducts();
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Network error'); }
    setUpdating(null);
  };

  const getVerifyColor = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      not_submitted: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.store_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.vendor_city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/admin" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-800">Product Management</h1>
            <p className="text-gray-500 text-sm">{filtered.length} products</p>
          </div>
          <Link href="/dashboard/admin/product-verification"
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-600 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Product Vetting
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Products', count: products.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Active', count: products.filter(p => p.is_active).length, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Pending Vetting', count: products.filter(p => p.verification_status === 'pending').length, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Featured', count: products.filter(p => p.is_featured).length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <p className="text-2xl font-black">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col gap-3">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && fetchProducts()}
              placeholder="Search products, vendors, cities..."
              className="flex-1 bg-transparent focus:outline-none text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Status:</span>
            </div>
            {['all', 'active', 'inactive'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Vetting:</span>
            </div>
            {['all', 'pending', 'approved', 'rejected', 'not_submitted'].map(s => (
              <button key={s} onClick={() => setVerifyFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${verifyFilter === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader className="w-10 h-10 text-orange-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const images = (() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } })();
              const isExpanded = expanded === product.id;
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {images[0] ? (
                        <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">{product.name}</h3>
                        {product.is_featured && (
                          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" /> Featured
                          </span>
                        )}
                        {product.is_ranked && (
                          <span className="bg-purple-100 text-purple-700 text-xs font-bold px-1.5 py-0.5 rounded-full">Ranked</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{product.store_name} · {product.vendor_city}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-bold text-orange-600">{formatPrice(product.price)}</span>
                        <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-gray-500">{product.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getVerifyColor(product.verification_status || 'not_submitted')}`}>
                        {(product.verification_status || 'not_submitted').replace('_', ' ')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateProduct(product.id, { is_active: product.is_active ? 0 : 1 })}
                        disabled={updating === product.id}
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${product.is_active ? 'bg-green-50 hover:bg-green-100 text-green-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                        {updating === product.id ? <Loader className="w-4 h-4 animate-spin" /> : product.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => updateProduct(product.id, { is_featured: product.is_featured ? 0 : 1 })}
                        disabled={updating === product.id}
                        title={product.is_featured ? 'Unfeature' : 'Feature'}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${product.is_featured ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : product.id)}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                        <p className="text-sm text-gray-700">{product.description || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Details</p>
                        <div className="space-y-1 text-sm">
                          <p>Category: <span className="font-medium">{product.category_name || '—'}</span></p>
                          <p>Unit: <span className="font-medium">{product.unit || 'piece'}</span></p>
                          <p>Total Sales: <span className="font-medium">{product.total_sales || 0}</span></p>
                          <p>Reviews: <span className="font-medium">{product.total_reviews || 0}</span></p>
                          <p>Listed: <span className="font-medium">{formatDate(product.created_at)}</span></p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Vetting Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updateProduct(product.id, { verification_status: 'approved' })}
                            className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600">
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => updateProduct(product.id, { verification_status: 'rejected', reason: 'Does not meet marketplace standards' })}
                            className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                          <button
                            onClick={() => updateProduct(product.id, { is_ranked: product.is_ranked ? 0 : 1 })}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${product.is_ranked ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                            <Crown className="w-3 h-3" /> {product.is_ranked ? 'Unrank' : 'Rank'}
                          </button>
                        </div>
                        {product.tags && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Tags:</p>
                            <div className="flex flex-wrap gap-1">
                              {(typeof product.tags === 'string' ? product.tags.split(',') : (Array.isArray(product.tags) ? product.tags : [])).map((t: string) => (
                                <span key={t} className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{t.trim()}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
