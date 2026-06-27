'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Heart, ArrowLeft, ShoppingCart, Trash2, ExternalLink } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { user, token, isLoading, refreshCart } = useApp();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchWishlist();
  }, [user, isLoading]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/wishlist', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setWishlist(data.data || []);
    } catch {}
    setLoading(false);
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const res = await fetch(`/api/users/wishlist/${productId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { toast.success('Removed from wishlist'); setWishlist(w => w.filter(p => p.id !== productId)); }
    } catch { toast.error('Failed to remove'); }
  };

  const addToCart = async (productId: string) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Added to cart!'); refreshCart(); }
      else toast.error(data.message || 'Failed');
    } catch { toast.error('Failed to add to cart'); }
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/customer/dashboard" className="p-2 rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" /> My Wishlist
            </h1>
            <p className="text-gray-500 text-sm">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved</p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <Heart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-700 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-400 mb-6">Save products you love to buy later</p>
            <Link href="/marketplace" className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlist.map((product: any) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="relative">
                  <img src={product.images?.[0] || 'https://placehold.co/300x200/f97316/white?text=Product'}
                    alt={product.name} className="w-full h-40 object-cover" />
                  <button onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                  {product.discount_percent > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      -{product.discount_percent}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{product.vendor_name}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-black text-orange-600">{formatPrice(product.price)}</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addToCart(product.id)}
                      className="flex-1 bg-orange-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-orange-600 flex items-center justify-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                    <Link href={`/product/${product.id}`}
                      className="w-8 h-8 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
