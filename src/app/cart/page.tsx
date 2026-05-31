'use client';
/**
 * ─── Dedicated Cart Page ──────────────────────────────────────────────────────
 * Full cart experience with:
 *  - Itemised cart with quantity controls and remove
 *  - Coupon / promo code validation
 *  - Real-time order summary with delivery estimate
 *  - Empty state with product discovery CTA
 *  - Guest upsell prompt (register to track order)
 *  - Checkout CTA linking to /checkout
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useApp } from '@/components/AppContext';
import { formatPrice } from '@/lib/utils';
import { CartItem, Product } from '@/types';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, ArrowRight,
  Package, Truck, Shield, RotateCcw, ChevronRight,
  Loader, ShoppingBag, Zap, X
} from 'lucide-react';

interface CartItemWithProduct extends CartItem {
  product: Product;
  price: number; // resolved price from API
}

interface CartData {
  items: CartItemWithProduct[];
  count: number;
  subtotal?: number;
}

const DELIVERY_FEE = 500;
const FREE_DELIVERY_THRESHOLD = 5000;

export default function CartPage() {
  const router = useRouter();
  const { user, token, refreshCart } = useApp();

  const [cartItems, setCartItems]       = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading]           = useState(true);
  const [updatingId, setUpdatingId]     = useState<string | null>(null);
  const [removingId, setRemovingId]     = useState<string | null>(null);
  const [couponCode, setCouponCode]     = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; type: 'percent' | 'fixed' } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  /* ── Fetch cart ─────────────────────────────────────────────────────────── */
  const fetchCart = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res  = await fetch('/api/cart', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setCartItems(data.data?.items ?? []);
      }
    } catch {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  /* ── Update quantity ────────────────────────────────────────────────────── */
  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setUpdatingId(itemId);
    try {
      const res  = await fetch(`/api/cart/${itemId}`, {
        method:  'PUT',
        headers: authHeaders(),
        body:    JSON.stringify({ quantity: newQty }),
      });
      const data = await res.json();
      if (data.success) {
        setCartItems(prev =>
          prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i)
        );
        refreshCart();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Remove item ────────────────────────────────────────────────────────── */
  const removeItem = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      const res  = await fetch(`/api/cart/${itemId}`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCartItems(prev => prev.filter(i => i.id !== itemId));
        refreshCart();
        toast.success('Item removed');
      } else {
        toast.error(data.error || 'Failed to remove');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRemovingId(null);
    }
  };

  /* ── Clear cart ─────────────────────────────────────────────────────────── */
  const clearCart = async () => {
    if (!confirm('Remove all items from cart?')) return;
    try {
      await fetch('/api/cart', { method: 'DELETE', headers: authHeaders() });
      setCartItems([]);
      refreshCart();
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  /* ── Apply coupon ───────────────────────────────────────────────────────── */
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res  = await fetch(`/api/coupons/validate/${encodeURIComponent(couponCode.trim().toUpperCase())}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const coupon = data.data;
        setCouponApplied({
          code:     coupon.code,
          discount: coupon.discount_value,
          type:     coupon.discount_type === 'percentage' ? 'percent' : 'fixed',
        });
        toast.success(`Coupon applied! You save ${coupon.discount_type === 'percentage' ? coupon.discount_value + '%' : formatPrice(coupon.discount_value)}`);
      } else {
        toast.error(data.error || 'Invalid coupon code');
      }
    } catch {
      toast.error('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  /* ── Proceed to checkout ────────────────────────────────────────────────── */
  const proceedToCheckout = () => {
    if (!user) {
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    setCheckoutLoading(true);
    router.push('/checkout');
  };

  /* ── Computed totals ────────────────────────────────────────────────────── */
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = item.price ?? item.product?.price ?? 0;
    return sum + itemPrice * item.quantity;
  }, 0);

  const discountAmount = couponApplied
    ? couponApplied.type === 'percent'
      ? Math.round(subtotal * couponApplied.discount / 100)
      : couponApplied.discount
    : 0;

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total       = subtotal - discountAmount + deliveryFee;
  const savings     = cartItems.reduce((sum, item) => {
    const op = item.product?.original_price;
    if (!op || op <= (item.price ?? item.product?.price)) return sum;
    return sum + (op - (item.price ?? item.product?.price)) * item.quantity;
  }, 0);

  /* ── Loading state ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 skeleton w-40 mb-6 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="panel p-4 flex gap-4">
                  <div className="skeleton w-20 h-20 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                    <div className="skeleton h-6 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="panel p-4 h-64 skeleton" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Not logged in ──────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-3">Sign in to view your cart</h1>
          <p className="text-gray-500 mb-8">Your cart items are saved. Sign in to continue shopping.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/login?redirect=/cart" className="btn-primary px-8 py-3">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-secondary px-8 py-3">
              Create Account
            </Link>
          </div>
          <Link href="/marketplace" className="block mt-6 text-sm text-orange-600 hover:underline">
            Continue browsing →
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Empty cart ─────────────────────────────────────────────────────────── */
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-orange-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-3">Your cart is empty</h1>
          <p className="text-gray-500 mb-2">Looks like you haven't added anything yet.</p>
          <p className="text-gray-400 text-sm mb-8">Discover great products from local vendors near you!</p>
          <Link href="/marketplace" className="btn-primary px-8 py-3 text-base">
            Start Shopping <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-500">
            {[
              { icon: Truck,      label: '48hr Delivery' },
              { icon: Shield,     label: 'Buyer Protection' },
              { icon: RotateCcw,  label: 'Easy Returns' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Full cart ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/marketplace" className="hover:text-orange-500 transition-colors">Marketplace</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-800 font-medium">Cart ({cartItems.length})</span>
        </nav>

        {/* Page title row */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-500" />
            Shopping Cart
          </h1>
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 hover:underline transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear cart
          </button>
        </div>

        {/* Free delivery progress bar */}
        {subtotal < FREE_DELIVERY_THRESHOLD && (
          <div className="panel p-4 mb-4 bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-amber-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                Add {formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)} more for <strong>FREE delivery</strong>
              </span>
              <span className="text-amber-600 text-xs">
                {Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%
              </span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {subtotal >= FREE_DELIVERY_THRESHOLD && (
          <div className="panel p-3 mb-4 bg-green-50 border border-green-100 flex items-center gap-2 text-green-700 text-sm font-medium">
            <Truck className="w-4 h-4" />
            🎉 You qualify for FREE delivery!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Cart items ────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map(item => {
              const product  = item.product;
              const price    = item.price ?? product?.price ?? 0;
              const images   = Array.isArray(product?.images) ? product.images : [];
              const imgSrc   = images[0] || `https://picsum.photos/seed/${item.product_id}/120/120`;
              const isUpdating = updatingId === item.id;
              const isRemoving = removingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`panel p-4 flex gap-4 transition-opacity ${isRemoving ? 'opacity-40' : 'opacity-100'}`}
                >
                  {/* Product image */}
                  <Link href={`/product/${item.product_id}`} className="flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                      <img
                        src={imgSrc}
                        alt={product?.name ?? 'Product'}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </Link>

                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/product/${item.product_id}`}>
                          <h3 className="font-semibold text-gray-800 text-sm leading-snug hover:text-orange-600 transition-colors line-clamp-2">
                            {product?.name ?? 'Product'}
                          </h3>
                        </Link>
                        {product?.vendor_name && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            by <span className="text-gray-500">{product.vendor_name}</span>
                            {product.vendor_city && ` · ${product.vendor_city}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isRemoving}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        {isRemoving
                          ? <Loader className="w-4 h-4 animate-spin" />
                          : <X className="w-4 h-4" />
                        }
                      </button>
                    </div>

                    {/* Price + original */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold text-gray-900">{formatPrice(price)}</span>
                      {product?.original_price && product.original_price > price && (
                        <>
                          <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                            -{Math.round((1 - price / product.original_price) * 100)}%
                          </span>
                        </>
                      )}
                    </div>

                    {/* Stock warning */}
                    {product?.stock && product.stock <= 5 && (
                      <p className="text-xs text-red-500 font-medium mt-1">
                        Only {product.stock} left!
                      </p>
                    )}

                    {/* Quantity controls + line total */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isUpdating}
                          className="px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 transition-colors text-gray-600"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-4 py-1.5 text-sm font-bold text-gray-800 border-x border-gray-200 min-w-[40px] text-center">
                          {isUpdating ? <Loader className="w-3.5 h-3.5 animate-spin mx-auto" /> : item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={(product?.stock !== undefined && item.quantity >= product.stock) || isUpdating}
                          className="px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 transition-colors text-gray-600"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">
                        {formatPrice(price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Coupon input */}
            <div className="panel p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-500" /> Promo / Coupon Code
              </h3>
              {couponApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    <span>
                      <strong>{couponApplied.code}</strong> — save{' '}
                      {couponApplied.type === 'percent'
                        ? `${couponApplied.discount}% (${formatPrice(discountAmount)})`
                        : formatPrice(couponApplied.discount)}
                    </span>
                  </div>
                  <button onClick={removeCoupon} className="text-green-600 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder="Enter coupon code"
                    className="input flex-1 text-sm uppercase"
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn-primary px-5 text-sm flex-shrink-0"
                  >
                    {couponLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Continue shopping */}
            <div className="flex items-center justify-between text-sm py-1">
              <Link href="/marketplace" className="text-orange-600 hover:underline flex items-center gap-1 font-medium">
                ← Continue Shopping
              </Link>
              <span className="text-gray-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</span>
            </div>
          </div>

          {/* ── Order summary ──────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Summary card */}
            <div className="panel p-5">
              <h2 className="font-bold text-gray-800 text-base mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon discount</span>
                    <span className="font-medium">−{formatPrice(discountAmount)}</span>
                  </div>
                )}

                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>You save</span>
                    <span className="font-medium">−{formatPrice(savings)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    Delivery fee
                    {deliveryFee === 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded font-semibold">FREE</span>
                    )}
                  </span>
                  <span className={`font-medium ${deliveryFee === 0 ? 'text-green-600 line-through text-gray-400' : ''}`}>
                    {deliveryFee === 0 ? formatPrice(DELIVERY_FEE) : formatPrice(deliveryFee)}
                  </span>
                </div>

                {deliveryFee === 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Free delivery applied</span>
                    <span className="font-medium">−{formatPrice(DELIVERY_FEE)}</span>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span className="text-orange-600">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={proceedToCheckout}
                disabled={checkoutLoading}
                className="btn-primary w-full mt-5 py-3.5 text-base font-bold flex items-center justify-center gap-2"
              >
                {checkoutLoading
                  ? <Loader className="w-5 h-5 animate-spin" />
                  : <>Proceed to Checkout <ArrowRight className="w-5 h-5" /></>
                }
              </button>

              <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secure checkout · SSL encrypted
              </p>
            </div>

            {/* Trust badges */}
            <div className="panel p-4">
              <div className="space-y-3">
                {[
                  { icon: Truck,     color: 'text-blue-500',  bg: 'bg-blue-50',  title: '48-Hour Delivery',    sub: 'To all major cities' },
                  { icon: Shield,    color: 'text-green-500', bg: 'bg-green-50', title: 'Buyer Protection',    sub: 'Full refund if issues arise' },
                  { icon: RotateCcw, color: 'text-purple-500', bg: 'bg-purple-50', title: '7-Day Returns',    sub: 'No questions asked' },
                  { icon: Package,   color: 'text-orange-500', bg: 'bg-orange-50', title: 'Verified Vendors', sub: 'All sellers are vetted' },
                ].map(({ icon: Icon, color, bg, title, sub }) => (
                  <div key={title} className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${color} w-[18px] h-[18px]`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accepted payments */}
            <div className="panel p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">We accept</p>
              <div className="flex flex-wrap gap-2">
                {['Paystack', 'Flutterwave', 'Bank Transfer', 'USSD', 'Crypto'].map(p => (
                  <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
