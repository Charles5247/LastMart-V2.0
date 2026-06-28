'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, Plus, Search, Filter, Edit2, Trash2, Eye, EyeOff,
  ArrowLeft, AlertTriangle, CheckCircle, Tag, BarChart2, Star,
  ChevronLeft, ChevronRight, X, Store, LogOut, ShoppingBag,
  DollarSign, TrendingUp, Settings, Bell, Upload, ImageIcon
} from 'lucide-react';
import { useRef } from 'react';
import { getStoredToken, clearStoredToken, isVendorAuthenticated } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? 'http://localhost:3001';

const NAV = [
  { href: '/dashboard',  icon: BarChart2,   label: 'Dashboard' },
  { href: '/products',   icon: Package,      label: 'Products', active: true },
  { href: '/orders',     icon: ShoppingBag,  label: 'Orders' },
  { href: '/analytics',  icon: TrendingUp,   label: 'Analytics' },
  { href: '/payouts',    icon: DollarSign,   label: 'Payouts' },
  { href: '/settings',   icon: Settings,     label: 'Settings' },
];

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  images?: string[];
  description?: string;
  rating?: number;
  total_orders?: number;
}

export default function VendorProductsPage() {
  const router = useRouter();
  const [products,    setProducts]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [navOpen,     setNavOpen]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', price: '', stock: '', category: '', description: '', status: 'active'
  });
  const [formLoading, setFormLoading] = useState(false);
  // Image files
  const [imageFiles,   setImageFiles]   = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const token = getStoredToken();
  const hdrs   = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isVendorAuthenticated()) { router.replace('/auth/login'); return; }
    fetchProducts();
  }, [page, search, filterStatus]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '12',
        ...(search       && { search }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      const res  = await fetch(`${API}/vendors/products?${params}`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      }
    } catch { toast.error('Failed to load products'); }
    finally   { setLoading(false); }
  };

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: '', price: '', stock: '', category: '', description: '', status: 'active' });
    setImageFiles([]);
    setImagePreviews([]);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock),
               category: p.category ?? '', description: p.description ?? '', status: p.status });
    setImageFiles([]);
    setImagePreviews(p.images ?? []);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const remaining = 5 - imageFiles.length;
    const toAdd = selected.slice(0, remaining);
    setImageFiles(prev => [...prev, ...toAdd]);
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url    = editProduct ? `${API}/products/${editProduct.id}` : `${API}/products`;
      const method = editProduct ? 'PUT' : 'POST';

      let res: Response;
      if (imageFiles.length > 0) {
        /* Use multipart/form-data when new image files are selected */
        const fd = new FormData();
        fd.append('name',        form.name);
        fd.append('price',       form.price);
        fd.append('stock',       form.stock);
        fd.append('category',    form.category);
        fd.append('description', form.description);
        fd.append('status',      form.status);
        imageFiles.forEach(f => fd.append('images', f));
        res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      } else {
        /* JSON when no new image files */
        const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
        res = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(body) });
      }

      const data = await res.json();
      if (data.success) {
        toast.success(editProduct ? 'Product updated!' : 'Product created!');
        setShowForm(false);
        fetchProducts();
      } else { toast.error(data.message ?? 'Operation failed'); }
    } catch { toast.error('Something went wrong'); }
    finally { setFormLoading(false); }
  };

  const toggleStatus = async (p: Product) => {
    try {
      const newStatus = p.status === 'active' ? 'inactive' : 'active';
      const res  = await fetch(`${API}/products/${p.id}`, {
        method: 'PUT', headers: hdrs(), body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Product ${newStatus}`);
        setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: newStatus } : pr));
      }
    } catch { toast.error('Failed to update status'); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const res  = await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        toast.success('Product deleted');
        setProducts(prev => prev.filter(p => p.id !== id));
      } else { toast.error(data.message ?? 'Delete failed'); }
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(null); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  const statusColor = (s: string) =>
    s === 'active'   ? 'bg-green-100 text-green-700'  :
    s === 'inactive' ? 'bg-gray-100 text-gray-600'    :
                       'bg-yellow-100 text-yellow-700';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
        ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LastMart</p>
            <p className="text-orange-400 text-xs font-medium">Vendor Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${n.active ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-800 pt-3">
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full transition-colors">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Store className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Products</h1>
              <p className="text-xs text-gray-500">Manage your product catalogue</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />Add Product
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search products…" className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {['all','active','inactive','pending'].map(s => (
                <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                    ${filterStatus === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({length:6}).map((_,i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-40 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Products Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Start adding products to your store.</p>
              <button onClick={openCreate}
                className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors">
                Add First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-100 flex items-center justify-center relative">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      : <Package className="w-12 h-12 text-gray-300" />}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{p.name}</h3>
                    <div className="flex items-center justify-between mt-1 mb-3">
                      <span className="text-orange-600 font-black">{formatPrice(p.price)}</span>
                      <span className="text-xs text-gray-500">Stock: <b>{p.stock}</b></span>
                    </div>
                    {p.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-gray-600">{p.rating.toFixed(1)}</span>
                        {p.total_orders && <span className="text-xs text-gray-400 ml-1">· {p.total_orders} orders</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />Edit
                      </button>
                      <button onClick={() => toggleStatus(p)}
                        className={`p-2 rounded-lg transition-colors ${p.status === 'active' ? 'bg-orange-50 hover:bg-orange-100 text-orange-600' : 'bg-green-50 hover:bg-green-100 text-green-600'}`}
                        title={p.status === 'active' ? 'Deactivate' : 'Activate'}>
                        {p.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteProduct(p.id)} disabled={deleting === p.id}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-black text-gray-900">
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                <input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Fresh Tomatoes" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price (₦) *</label>
                  <input required type="number" min="0" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stock *</label>
                  <input required type="number" min="0" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <input value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Groceries" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="Describe your product…" />
              </div>

              {/* Product Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Product Images <span className="text-xs font-normal text-gray-400">(up to 5)</span>
                </label>
                {/* Preview grid */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={src} alt={`img-${i}`} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:border-orange-300 hover:bg-orange-50 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-400" />
                      </button>
                    )}
                  </div>
                )}
                {/* Upload button (shown when no previews yet) */}
                {imagePreviews.length === 0 && (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Click to upload product photos</p>
                    <p className="text-xs text-gray-400">PNG, JPG · max 5 MB each · up to 5 images</p>
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-60">
                  {formLoading ? 'Saving…' : editProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
