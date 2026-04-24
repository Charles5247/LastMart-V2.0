'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import {
  Plus, Edit2, Trash2, Search, ArrowLeft, X, Package, Star,
  AlertTriangle, Shield, CheckCircle, Clock, XCircle, ChevronDown, Loader
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

const VETTING_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  not_submitted: 'bg-gray-100 text-gray-600 border-gray-200',
};

const VETTING_ICONS: Record<string, React.ReactElement> = {
  approved: <CheckCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
  not_submitted: <Shield className="w-3 h-3" />,
};

export default function VendorProductsPage() {
  const { user, vendor, token, isLoading } = useApp();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [vettingProduct, setVettingProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submittingVet, setSubmittingVet] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', original_price: '',
    category_id: '', stock: '', unit: 'piece', images: [''], tags: ''
  });
  const [vetForm, setVetForm] = useState({
    availability_proof_url: '',
    authenticity_proof_url: '',
    supplier_name: '',
    supplier_contact: '',
    product_origin: '',
    certifications: '',
    warranty_info: '',
    disclosures: '',
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'vendor')) { router.push('/auth/login'); return; }
    if (user) { fetchProducts(); fetchCategories(); }
  }, [user, isLoading]);

  const fetchProducts = async () => {
    setLoading(true);
    if (!vendor) { setLoading(false); return; }
    const res = await fetch(`/api/products?vendor_id=${vendor.id}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) setCategories(data.data);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name, description: product.description || '',
      price: String(product.price), original_price: String(product.original_price || ''),
      category_id: product.category_id || '', stock: String(product.stock),
      unit: product.unit || 'piece',
      images: product.images?.length ? product.images : [''],
      tags: (product.tags || []).join(', ')
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: '', original_price: '', category_id: '', stock: '', unit: 'piece', images: [''], tags: '' });
    setShowModal(true);
  };

  const openVetting = (product: any) => {
    setVettingProduct(product);
    setVetForm({
      availability_proof_url: '',
      authenticity_proof_url: '',
      supplier_name: '',
      supplier_contact: '',
      product_origin: '',
      certifications: '',
      warranty_info: '',
      disclosures: '',
    });
    setShowVetModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.price || !form.stock) {
      toast.error('Name, price and stock are required'); return;
    }
    setSaving(true);
    const body = {
      ...form,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      stock: parseInt(form.stock),
      images: form.images.filter(Boolean),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    };
    try {
      let res;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...body, is_active: editingProduct.is_active, is_featured: editingProduct.is_featured })
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });
      }
      const data = await res.json();
      if (data.success) {
        toast.success(editingProduct ? 'Product updated!' : 'Product created! Submit it for vetting to increase visibility.');
        setShowModal(false);
        fetchProducts();
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const submitForVetting = async () => {
    if (!vettingProduct) return;
    if (!vetForm.availability_proof_url && !vetForm.authenticity_proof_url) {
      toast.error('At least one proof document URL is required'); return;
    }
    setSubmittingVet(true);
    try {
      // Map UI fields to backend schema fields
      const payload = {
        product_id: vettingProduct.id,
        // Availability
        availability_status: vetForm.availability_proof_url ? 'in_stock' : 'pending',
        stock_proof_url: vetForm.availability_proof_url || null,
        // Authenticity
        brand_auth_doc_url: vetForm.authenticity_proof_url || null,
        origin_doc_url: vetForm.product_origin || null,
        invoice_url: vetForm.supplier_contact ? `Supplier: ${vetForm.supplier_name} (${vetForm.supplier_contact})` : vetForm.supplier_name || null,
        lab_cert_url: vetForm.certifications || null,
        // Disclosures
        disclaimer_accepted: true,
        disclaimer_text: [
          vetForm.warranty_info ? `Warranty: ${vetForm.warranty_info}` : '',
          vetForm.disclosures || '',
        ].filter(Boolean).join(' | ') || 'Vendor confirmed product availability and authenticity.',
      };
      const res = await fetch('/api/verification/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Product submitted for vetting! Admin will review within 24-48 hours.');
        setShowVetModal(false);
        fetchProducts();
      } else {
        toast.error(data.error || 'Failed to submit');
      }
    } catch { toast.error('Network error'); }
    setSubmittingVet(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) { toast.success('Product deleted'); fetchProducts(); }
    else toast.error(data.error);
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingVetting = products.filter(p =>
    !p.verification_status || p.verification_status === 'not_submitted'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/vendor" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Product Management</h1>
              <p className="text-gray-500 text-sm">{products.length} products</p>
            </div>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Vetting Banner */}
        {pendingVetting > 0 && (
          <div className="mb-5 bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-teal-800">
                {pendingVetting} product{pendingVetting > 1 ? 's' : ''} not yet vetted
              </p>
              <p className="text-xs text-teal-600 mt-0.5">
                Submit your products for vetting to get a verified badge, appear higher in search results, and build customer trust. Click the 🛡️ icon on each product card.
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 focus:outline-none text-sm text-gray-700"
          />
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(product => {
              const vetStatus = product.verification_status || 'not_submitted';
              const vetColor = VETTING_COLORS[vetStatus] || VETTING_COLORS.not_submitted;
              const vetIcon = VETTING_ICONS[vetStatus];
              return (
                <div key={product.id}
                  className={`bg-white rounded-2xl shadow-sm border ${product.is_active ? 'border-gray-100' : 'border-red-100 opacity-60'} overflow-hidden hover:shadow-md transition-shadow`}>
                  <div className="relative aspect-square bg-gray-100">
                    <img
                      src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/300/300`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.stock < 5 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </div>
                    )}
                    {!product.is_active && (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Inactive</div>
                    )}
                    {/* Vetting badge */}
                    <div className={`absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${vetColor}`}>
                      {vetIcon}
                      <span>{vetStatus === 'not_submitted' ? 'Not Vetted' : vetStatus.charAt(0).toUpperCase() + vetStatus.slice(1)}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-gray-500">{product.rating} ({product.total_reviews})</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-orange-600">{formatPrice(product.price)}</span>
                      <span className={`text-xs font-medium ${product.stock < 5 ? 'text-red-500' : 'text-green-600'}`}>
                        {product.stock} units
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(product)}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      {/* Vetting button */}
                      {vetStatus === 'not_submitted' || vetStatus === 'rejected' ? (
                        <button onClick={() => openVetting(product)}
                          title="Submit for vetting"
                          className="flex items-center justify-center bg-teal-50 text-teal-600 w-8 rounded-lg hover:bg-teal-100 transition-colors">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button onClick={() => deleteProduct(product.id)}
                        className="flex items-center justify-center bg-red-50 text-red-500 w-8 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No products yet</h3>
            <button onClick={openCreate} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium mt-2 hover:bg-orange-600">
              Add First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Product Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. iPhone 15 Pro" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Price (₦) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Original Price (₦)</label>
                  <input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))}
                    placeholder="For discount" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Stock *</label>
                  <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                    {['piece', 'kg', 'litre', 'pack', 'bag', 'set', 'pair', 'dozen'].map(u =>
                      <option key={u} value={u}>{u}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Category</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Product Image URL</label>
                <input value={form.images[0]} onChange={e => setForm(f => ({ ...f, images: [e.target.value] }))}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="electronics, phone, apple"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={saveProduct} disabled={saving}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Vetting Modal */}
      {showVetModal && vettingProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800">Submit for Vetting</h2>
                  <p className="text-xs text-gray-500 truncate max-w-[220px]">{vettingProduct.name}</p>
                </div>
              </div>
              <button onClick={() => setShowVetModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Disclosure Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold mb-1">📋 Vetting Requirements</p>
                <p>Provide documentation proving product availability, authenticity, and origin. Fraudulent submissions result in account suspension per our Terms & Conditions.</p>
              </div>

              {/* Availability Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-green-700 text-xs font-black">1</span>
                  Availability Proof *
                </h3>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Document URL (invoice, stock photo, warehouse photo)</label>
                  <input
                    value={vetForm.availability_proof_url}
                    onChange={e => setVetForm(f => ({ ...f, availability_proof_url: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Supplier/Source Name</label>
                    <input
                      value={vetForm.supplier_name}
                      onChange={e => setVetForm(f => ({ ...f, supplier_name: e.target.value }))}
                      placeholder="e.g. Samsung Nigeria"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Supplier Contact</label>
                    <input
                      value={vetForm.supplier_contact}
                      onChange={e => setVetForm(f => ({ ...f, supplier_contact: e.target.value }))}
                      placeholder="Phone or email"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              </div>

              {/* Authenticity Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-xs font-black">2</span>
                  Authenticity Proof
                </h3>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Certificate/Authenticity Doc URL</label>
                  <input
                    value={vetForm.authenticity_proof_url}
                    onChange={e => setVetForm(f => ({ ...f, authenticity_proof_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Product Origin / Country</label>
                    <input
                      value={vetForm.product_origin}
                      onChange={e => setVetForm(f => ({ ...f, product_origin: e.target.value }))}
                      placeholder="e.g. Made in Nigeria"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Certifications (comma sep.)</label>
                    <input
                      value={vetForm.certifications}
                      onChange={e => setVetForm(f => ({ ...f, certifications: e.target.value }))}
                      placeholder="NAFDAC, ISO, CE"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              </div>

              {/* Disclosures */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 text-xs font-black">3</span>
                  Required Disclosures
                </h3>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Warranty / Return Policy</label>
                  <input
                    value={vetForm.warranty_info}
                    onChange={e => setVetForm(f => ({ ...f, warranty_info: e.target.value }))}
                    placeholder="e.g. 1-year manufacturer warranty, 7-day returns"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Additional Disclosures / Notes to Admin</label>
                  <textarea
                    value={vetForm.disclosures}
                    onChange={e => setVetForm(f => ({ ...f, disclosures: e.target.value }))}
                    placeholder="Any known limitations, usage warnings, age restrictions, expiry dates, etc."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none"
                  />
                </div>
              </div>

              {/* Consent */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-200">
                By submitting, you confirm that all information provided is accurate. Providing false documentation may result in permanent account suspension and legal action per LastMart's Terms & Conditions.
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowVetModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={submitForVetting} disabled={submittingVet}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-green-600 text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submittingVet ? <Loader className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {submittingVet ? 'Submitting...' : 'Submit for Vetting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
