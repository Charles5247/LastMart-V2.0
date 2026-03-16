'use client';
import Link from 'next/link';
import { Star, MapPin, Clock, ShoppingCart, Heart, Zap, Eye } from 'lucide-react';
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
  const [hovered, setHovered] = useState(false);

  const images = Array.isArray(product.images) ? product.images : [];
  const imgSrc = images[0] || `https://picsum.photos/seed/${product.id}/400/400`;
  const imgSrc2 = images[1] || imgSrc;

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !token) { window.location.href = '/auth/login'; return; }
    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Added to cart!'); refreshCart(); }
      else toast.error(data.error || 'Failed to add');
    } catch { toast.error('Network error'); }
    setAdding(false);
  };

  // Star rating display
  const rating = Number(product.rating) || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group product-card flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image area ── */}
      <div className="relative overflow-hidden bg-gray-50" style={{ paddingBottom: '100%' }}>
        <img
          src={hovered && images.length > 1 ? imgSrc2 : imgSrc}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge badge-sale">-{discount}%</span>
          )}
          {product.is_sponsored === 1 && (
            <span className="badge badge-sponsored flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> Ad
            </span>
          )}
          {product.is_featured === 1 && discount === 0 && (
            <span className="badge badge-hot">HOT</span>
          )}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-gray-600 font-semibold text-sm bg-white px-3 py-1 rounded-full border border-gray-200">Out of Stock</span>
          </div>
        )}

        {/* Hover quick actions */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-center justify-between transition-all duration-200 ${hovered && !isOutOfStock ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <button
            onClick={addToCart}
            disabled={adding}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded-md transition-colors"
          >
            {adding
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <ShoppingCart className="w-3.5 h-3.5" />
            }
            Add to Cart
          </button>
          <Link
            href={`/product/${product.id}`}
            onClick={e => e.stopPropagation()}
            className="ml-2 w-8 h-8 bg-white/90 hover:bg-white rounded-md flex items-center justify-center text-gray-700 transition-colors flex-shrink-0"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Info area ── */}
      <div className="flex flex-col flex-1 p-3">
        {/* Vendor */}
        {showVendor && product.vendor_name && (
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{product.vendor_name}</span>
            {product.vendor_city && <span className="text-gray-300">·</span>}
            {product.vendor_city && <span className="truncate">{product.vendor_city}</span>}
          </p>
        )}

        {/* Product name */}
        <h3 className="text-sm text-gray-800 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors mb-1.5">
          {product.name}
        </h3>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="stars text-sm">
              {[1,2,3,4,5].map(i => (
                <span key={i} className={i <= fullStars ? 'text-yellow-400' : i === fullStars + 1 && hasHalf ? 'text-yellow-300' : 'text-gray-200'}>★</span>
              ))}
            </div>
            <span className="text-xs text-gray-400">({product.total_reviews || 0})</span>
          </div>
        )}

        {/* Spacer to push price to bottom */}
        <div className="flex-1" />

        {/* Price row */}
        <div className="flex items-end justify-between mt-1">
          <div>
            <span className="price-main">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="price-original">{formatPrice(product.original_price)}</span>
            )}
          </div>
          {isLowStock && (
            <span className="text-xs text-red-500 font-medium">{product.stock} left</span>
          )}
        </div>

        {/* Delivery note */}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>48hr delivery</span>
        </div>
      </div>
    </Link>
  );
}
