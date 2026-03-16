'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/ui/ProductCard';
import { formatPrice, getStatusColor } from '@/lib/utils';
import { useApp } from '@/components/AppContext';
import { ShoppingCart, Heart, Star, MapPin, Clock, Shield, ChevronLeft, Minus, Plus, Share2, Package, Store, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, refreshCart } = useApp();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setProduct(d.data); setLoading(false); });
  }, [params.id]);

  const addToCart = async () => {
    if (!user || !token) { router.push('/auth/login'); return; }
    setAddingToCart(true);
    const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: product.id, quantity }) });
    const data = await res.json();
    if (data.success) { toast.success(`${quantity} item(s) added to cart!`); refreshCart(); }
    else toast.error(data.error || 'Failed');
    setAddingToCart(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) { router.push('/auth/login'); return; }
    setSubmittingReview(true);
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ vendor_id: product.vendor_id, product_id: product.id, ...reviewForm }) });
    const data = await res.json();
    if (data.success) { toast.success('Review submitted!'); setReviewForm({ rating: 5, comment: '' }); fetch(`/api/products/${params.id}`).then(r => r.json()).then(d => { if (d.success) setProduct(d.data); }); }
    else toast.error(data.error);
    setSubmittingReview(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-96 bg-gray-200 rounded-3xl animate-pulse" />
          <div className="space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded-xl animate-pulse" />)}</div>
        </div>
      </div>
    </div>
  );

  if (!product) return <div className="min-h-screen flex items-center justify-center"><p>Product not found</p></div>;

  const images = Array.isArray(product.images) ? product.images : [];
  const discount = product.original_price && product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-orange-500">Home</Link>
          <span>/</span>
          <Link href="/marketplace" className="hover:text-orange-500">Marketplace</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Images */}
          <div>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm aspect-square mb-4">
              <img src={images[selectedImage] || `https://picsum.photos/seed/${product.id}/600/600`} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-orange-500' : 'border-gray-200'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {product.category_name && (
              <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">{product.category_name}</span>
            )}
            <h1 className="text-3xl font-black text-gray-800 mt-3 mb-2">{product.name}</h1>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
              </div>
              <span className="text-sm text-gray-600">{product.rating} ({product.total_reviews} reviews)</span>
            </div>

            <div className="flex items-end gap-3 mb-6">
              <span className="text-4xl font-black text-gray-900">{formatPrice(product.price)}</span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.original_price)}</span>
                  <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-lg">-{discount}%</span>
                </>
              )}
            </div>

            {product.description && <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>}

            {/* Vendor Info */}
            <Link href={`/vendor/${product.vendor_id}`} className="flex items-center gap-3 bg-orange-50 rounded-2xl p-4 mb-6 hover:bg-orange-100 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">{product.vendor_name?.charAt(0)}</div>
              <div>
                <p className="font-semibold text-gray-800">{product.vendor_name}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500" />{product.vendor_city}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{product.vendor_rating || 0}</span>
              </div>
            </Link>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 hover:bg-gray-100 transition-colors"><Minus className="w-4 h-4" /></button>
                <span className="px-6 py-2 font-bold text-gray-800">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={quantity >= product.stock} className="px-4 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50"><Plus className="w-4 h-4" /></button>
              </div>
              <span className="text-sm text-gray-500">{product.stock > 0 ? `${product.stock} available` : <span className="text-red-500 font-medium">Out of stock</span>}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button onClick={addToCart} disabled={product.stock === 0 || addingToCart} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg">
                {addingToCart ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

            {/* Delivery Info */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0"><Truck className="w-4 h-4 text-green-600" /></div>
                <div><p className="font-medium text-gray-800">48-Hour Delivery</p><p className="text-gray-500">Guaranteed delivery within 48 hours</p></div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"><Shield className="w-4 h-4 text-blue-600" /></div>
                <div><p className="font-medium text-gray-800">Secure Payment</p><p className="text-gray-500">Your payment is protected</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-3xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Customer Reviews</h2>
          
          {/* Review Form */}
          {user?.role === 'customer' && (
            <form onSubmit={submitReview} className="bg-orange-50 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold text-gray-800 mb-4">Write a Review</h3>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(r => (
                    <button key={r} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: r }))} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${reviewForm.rating >= r ? 'bg-yellow-400 shadow-md scale-110' : 'bg-gray-100 hover:bg-yellow-100'}`}>⭐</button>
                  ))}
                </div>
              </div>
              <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Share your experience..." rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 mb-4 resize-none" />
              <button type="submit" disabled={submittingReview} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}

          {product.reviews?.length > 0 ? (
            <div className="space-y-4">
              {product.reviews.map((review: any) => (
                <div key={review.id} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{review.customer_name?.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-800 text-sm">{review.customer_name}</p>
                        <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
                      </div>
                      {review.comment && <p className="text-gray-600 text-sm">{review.comment}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-8">No reviews yet. Be the first to review!</p>}
        </div>

        {/* Related Products */}
        {product.related?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {product.related.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
