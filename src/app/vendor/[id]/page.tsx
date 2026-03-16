'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/ui/ProductCard';
import { formatPrice } from '@/lib/utils';
import { useApp } from '@/components/AppContext';
import { Star, MapPin, Package, Heart, Share2, Phone, Mail, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorPage() {
  const params = useParams();
  const { user, token } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    fetch(`/api/vendors/${params.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); setLoading(false); });
  }, [params.id]);

  const handleSave = async () => {
    if (!user || !token) { window.location.href = '/auth/login'; return; }
    try {
      if (isSaved) {
        await fetch(`/api/users/saved-vendors?vendor_id=${params.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setIsSaved(false); toast.success('Removed from saved');
      } else {
        const res = await fetch('/api/users/saved-vendors', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ vendor_id: params.id }) });
        if ((await res.json()).success) { setIsSaved(true); toast.success('Vendor saved!'); }
      }
    } catch { toast.error('Network error'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="h-60 bg-gray-200 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">{[...Array(8)].map((_, i) => <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen flex items-center justify-center"><p>Vendor not found</p></div>;

  const { vendor, products, reviews } = data;
  const filteredProducts = searchProduct ? products.filter((p: any) => p.name.toLowerCase().includes(searchProduct.toLowerCase())) : products;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Banner */}
      <div className="relative h-56 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 overflow-hidden">
        {vendor.banner && <img src={vendor.banner} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Vendor Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-3xl border-4 border-white overflow-hidden">
                {vendor.logo ? <img src={vendor.logo} alt={vendor.store_name} className="w-full h-full object-cover" /> : <span>{vendor.store_name.charAt(0)}</span>}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black">{vendor.store_name}</h1>
                  {vendor.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vendor.city}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{vendor.rating} ({vendor.total_reviews})</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${isSaved ? 'bg-red-500 text-white' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'}`}>
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Store Info</h3>
              <div className="space-y-3 text-sm">
                {vendor.description && <p className="text-gray-600 leading-relaxed">{vendor.description}</p>}
                {vendor.category && <div className="flex items-center gap-2"><Package className="w-4 h-4 text-orange-500" /><span className="text-gray-600">{vendor.category}</span></div>}
                {vendor.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500" /><span className="text-gray-600">{vendor.phone}</span></div>}
                {vendor.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-orange-500" /><span className="text-gray-600">{vendor.email}</span></div>}
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /><span className="text-gray-600">Delivery: 48hrs max</span></div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-orange-600">{products.length}</p>
                  <p className="text-xs text-gray-500">Products</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-yellow-600">{vendor.rating}</p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
              </div>
            </div>

            {/* Reviews Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Recent Reviews</h3>
              {reviews.length > 0 ? reviews.slice(0, 3).map((r: any) => (
                <div key={r.id} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{r.customer_name}</span>
                    <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />)}</div>
                  </div>
                  {r.comment && <p className="text-xs text-gray-500 line-clamp-2">{r.comment}</p>}
                </div>
              )) : <p className="text-sm text-gray-400">No reviews yet</p>}
            </div>
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Products ({filteredProducts.length})</h2>
              <input value={searchProduct} onChange={e => setSearchProduct(e.target.value)} placeholder="Search in store..." className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-400 w-48" />
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {filteredProducts.map((p: any) => <ProductCard key={p.id} product={p} showVendor={false} />)}
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
