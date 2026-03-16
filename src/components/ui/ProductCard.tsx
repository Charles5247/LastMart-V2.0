'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Clock, Heart, ShoppingCart, Zap } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useApp } from '@/components/AppContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  showVendor?: boolean;
}

export default function ProductCard({ product, showVendor = true }: ProductCardProps) {
  const { user, token, refreshCart } = useApp();
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const images = Array.isArray(product.images) ? product.images : [];
  const imgSrc = images[0] || `https://picsum.photos/seed/${product.id}/400/400`;
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user || !token) { window.location.href = '/auth/login'; return; }
    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id, quantity: 1 })
      });
      const data = await res.json();
      if (data.success) { toast.success('Added to cart!'); refreshCart(); }
      else toast.error(data.error || 'Failed to add');
    } catch { toast.error('Network error'); }
    setAdding(false);
  };

  return (
    <Link href={`/product/${product.id}`} className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1">
      <div className="relative overflow-hidden bg-gray-100 aspect-square">
        <img src={imgSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_sponsored === 1 && (
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" />Sponsored</span>
          )}
          {product.is_featured === 1 && (
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Featured</span>
          )}
          {discount > 0 && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
          )}
        </div>

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Out of Stock</span>
          </div>
        )}

        {/* Add to Cart Overlay */}
        {product.stock > 0 && (
          <button
            onClick={addToCart}
            disabled={adding}
            className="absolute bottom-2 right-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0"
          >
            {adding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="p-4">
        {showVendor && product.vendor_name && (
          <p className="text-xs text-orange-500 font-medium mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {product.vendor_name} · {product.vendor_city}
          </p>
        )}
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 group-hover:text-orange-500 transition-colors">{product.name}</h3>
        
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-600">{product.rating || '0'}</span>
          <span className="text-xs text-gray-400">({product.total_reviews || 0})</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-xs text-gray-400 line-through ml-2">{formatPrice(product.original_price)}</span>
            )}
          </div>
          {product.stock < 5 && product.stock > 0 && (
            <span className="text-xs text-red-500 font-medium">Only {product.stock} left!</span>
          )}
        </div>

        <div className="flex items-center text-xs text-gray-400 mt-2 gap-1">
          <Clock className="w-3 h-3" />
          <span>Delivery within 48hrs</span>
        </div>
      </div>
    </Link>
  );
}
