'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Package, Heart, Settings, ShoppingCart, Star, Bell, TrendingUp, Truck, CheckCircle, Clock, User, MapPin, X, Minus, Plus, Trash2 } from 'lucide-react';
import { formatPrice, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CustomerDashboard() {
  const { user, token, cartCount, refreshCart, isLoading } = useApp();
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutForm, setCheckoutForm] = useState({ delivery_address: user?.address || '', delivery_city: user?.city || 'Lagos', payment_method: 'card', notes: '' });
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeTab, setActiveTab] = useState('cart');

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) {
      setCheckoutForm(f => ({ ...f, delivery_address: user.address || '', delivery_city: user.city || 'Lagos' }));
      fetchData();
    }
  }, [user, isLoading]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const [cartRes, ordersRes] = await Promise.all([
      fetch('/api/cart', { headers }),
      fetch('/api/orders?limit=5', { headers })
    ]);
    const [cartData, ordersData] = await Promise.all([cartRes.json(), ordersRes.json()]);
    if (cartData.success) setCart(cartData.data);
    if (ordersData.success) setOrders(ordersData.data);
    setLoading(false);
  };

  const updateCart = async (item_id: string, quantity: number) => {
    await fetch('/api/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ item_id, quantity }) });
    fetchData(); refreshCart();
  };

  const removeFromCart = async (item_id: string) => {
    await fetch(`/api/cart?item_id=${item_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Item removed'); fetchData(); refreshCart();
  };

  const checkout = async () => {
    if (!cart?.items?.length) { toast.error('Cart is empty'); return; }
    if (!checkoutForm.delivery_address) { toast.error('Delivery address required'); return; }
    setCheckingOut(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: cart.items.map((i: any) => ({ product_id: i.product_id, quantity: i.quantity })), ...checkoutForm })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order placed successfully! 🎉');
        setShowCheckout(false); fetchData(); refreshCart(); setActiveTab('orders');
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    setCheckingOut(false);
  };

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  const tabs = [
    { id: 'cart', label: 'Cart', icon: ShoppingCart, count: cartCount },
    { id: 'orders', label: 'Orders', icon: Package, count: orders.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-black">{user?.name?.charAt(0)}</div>
            <div>
              <h1 className="text-2xl font-black text-white">Welcome, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-orange-100 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" />{user?.city || 'Set your city'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Cart Items', value: cartCount, icon: ShoppingCart, color: 'from-orange-400 to-orange-600' },
            { label: 'Total Orders', value: orders.length, icon: Package, color: 'from-blue-400 to-blue-600' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle, color: 'from-green-400 to-green-600' },
            { label: 'In Transit', value: orders.filter(o => o.status === 'shipped').length, icon: Truck, color: 'from-purple-400 to-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === tab.id ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Cart Tab */}
            {activeTab === 'cart' && (
              <div>
                {cart?.items?.length > 0 ? (
                  <>
                    <div className="space-y-3 mb-6">
                      {cart.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                          <img src={item.product?.images?.[0] || `https://picsum.photos/seed/${item.product_id}/80/80`} alt={item.product?.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-500">{item.product?.vendor_name}</p>
                            <p className="text-orange-600 font-bold text-sm mt-1">{formatPrice(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => updateCart(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => updateCart(item.id, item.quantity + 1)} disabled={item.quantity >= item.product?.stock} className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center ml-2">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart Total */}
                    <div className="bg-orange-50 rounded-2xl p-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-bold text-gray-800">{formatPrice(cart.total)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-bold text-gray-800">{formatPrice(500)}</span>
                      </div>
                      <div className="border-t border-orange-200 pt-4 flex justify-between items-center">
                        <span className="text-lg font-black text-gray-800">Total</span>
                        <span className="text-xl font-black text-orange-600">{formatPrice(cart.total + 500)}</span>
                      </div>
                      <button onClick={() => setShowCheckout(true)} className="w-full mt-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-lg">
                        Proceed to Checkout
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Your cart is empty</h3>
                    <p className="text-gray-400 mb-6">Add items from the marketplace</p>
                    <Link href="/marketplace" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors">Shop Now</Link>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">Order #{order.id.slice(-8).toUpperCase()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{order.vendor_name} · {new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>{order.status.toUpperCase()}</span>
                        </div>

                        {order.items?.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {order.items.slice(0, 3).map((item: any) => (
                              <div key={item.id} className="text-xs bg-gray-50 rounded-xl px-3 py-1.5">
                                {item.product_name} × {item.quantity}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-black text-orange-600">{formatPrice(order.total_amount)}</span>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Est. delivery: {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : '48hrs'}</span>
                          </div>
                        </div>

                        {/* Tracking */}
                        {order.tracking_updates?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Truck className="w-3 h-3 text-orange-500" />
                              <span>{order.tracking_updates[order.tracking_updates.length - 1]?.message}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <Link href="/dashboard/customer/orders" className="block text-center text-orange-500 font-medium py-3 hover:text-orange-600">View All Orders →</Link>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders yet</h3>
                    <Link href="/marketplace" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium">Start Shopping</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: '/dashboard/customer/orders', icon: Package, label: 'All Orders', color: 'text-blue-600 bg-blue-50' },
            { href: '/dashboard/customer/saved', icon: Heart, label: 'Saved Vendors', color: 'text-red-600 bg-red-50' },
            { href: '/dashboard/customer/settings', icon: Settings, label: 'Account Settings', color: 'text-gray-600 bg-gray-50' },
            { href: '/marketplace', icon: ShoppingCart, label: 'Browse Products', color: 'text-orange-600 bg-orange-50' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 hover:shadow-md transition-shadow border border-gray-100">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${link.color}`}>
                <link.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800">Checkout</h2>
              <button onClick={() => setShowCheckout(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Delivery Address *</label>
                <textarea value={checkoutForm.delivery_address} onChange={e => setCheckoutForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder="Full delivery address" rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
                <input value={checkoutForm.delivery_city} onChange={e => setCheckoutForm(f => ({ ...f, delivery_city: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Payment Method</label>
                <select value={checkoutForm.payment_method} onChange={e => setCheckoutForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400">
                  <option value="card">💳 Card Payment</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="cash_on_delivery">💵 Cash on Delivery</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Order Notes (Optional)</label>
                <input value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions?" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
              </div>

              <div className="bg-orange-50 rounded-2xl p-4">
                <div className="flex justify-between text-sm mb-2"><span>Subtotal</span><span className="font-bold">{formatPrice(cart?.total || 0)}</span></div>
                <div className="flex justify-between text-sm mb-2"><span>Delivery</span><span className="font-bold">{formatPrice(500)}</span></div>
                <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span className="text-orange-600">{formatPrice((cart?.total || 0) + 500)}</span></div>
              </div>

              <button onClick={checkout} disabled={checkingOut} className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-4 rounded-2xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {checkingOut ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🎉 Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
