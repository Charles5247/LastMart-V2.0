'use client';
/**
 * ─── Checkout Page ────────────────────────────────────────────────────────────
 * A three-step checkout flow:
 *   Step 1 – Delivery address selection / creation + delivery mode picker
 *   Step 2 – Payment method selection (card, bank, USSD, crypto, gift card)
 *   Step 3 – Order confirmation + payment verification
 *
 * All API calls go through Next.js /api/* which proxies to the Express backend.
 * Works fully offline: demo payments always succeed without real gateway calls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  MapPin, Plus, Check, ChevronRight, Truck, Zap, Moon, Calendar, Store,
  CreditCard, Building2, Smartphone, Bitcoin, Gift, ArrowLeft, ArrowRight,
  Copy, RefreshCw, ShoppingBag, Loader, Star, Shield
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Address {
  id: string; label: string; recipient_name: string; recipient_phone: string;
  address: string; city: string; state?: string; is_default: number;
  delivery_instructions?: string;
}

interface DeliveryMode {
  id: string; label: string; description: string; fee: number; eta: string; icon: string;
}

interface PaymentMethod {
  id: string; label: string; icon: string; gateway: string; group: string;
}

interface CartSummary {
  items: any[]; subtotal: number; count: number;
}

/* ─── Delivery mode icons ────────────────────────────────────────────────────── */
const MODE_ICON: Record<string, React.ReactNode> = {
  standard:  <Truck    size={18} />,
  express:   <Zap      size={18} />,
  overnight: <Moon     size={18} />,
  scheduled: <Calendar size={18} />,
  pickup:    <Store    size={18} />,
};

/* ─── Payment group labels & icons ──────────────────────────────────────────── */
const GROUP_META: Record<string, { label: string; icon: React.ReactNode }> = {
  card:     { label: 'Card',         icon: <CreditCard  size={16} /> },
  bank:     { label: 'Bank',         icon: <Building2   size={16} /> },
  ussd:     { label: 'USSD',         icon: <Smartphone  size={16} /> },
  mobile:   { label: 'Mobile Money', icon: <Smartphone  size={16} /> },
  crypto:   { label: 'Crypto',       icon: <Bitcoin     size={16} /> },
  giftcard: { label: 'Gift Card',    icon: <Gift        size={16} /> },
};

export default function CheckoutPage() {
  const router   = useRouter();
  const { user, token, refreshCart } = useApp();

  /* ── Wizard state ─────────────────────────────────────────────────────────── */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* Step 1: delivery */
  const [addresses,      setAddresses]      = useState<Address[]>([]);
  const [selectedAddr,   setSelectedAddr]   = useState<string | null>(null);
  const [deliveryModes,  setDeliveryModes]  = useState<DeliveryMode[]>([]);
  const [selectedMode,   setSelectedMode]   = useState<string>('standard');
  const [showNewAddr,    setShowNewAddr]    = useState(false);
  const [addrForm,       setAddrForm]       = useState({
    label: 'Home', recipient_name: '', recipient_phone: '', address: '',
    city: '', state: '', delivery_instructions: '', is_default: true
  });

  /* Step 2: payment */
  const [payMethods,     setPayMethods]     = useState<PaymentMethod[]>([]);
  const [selectedPay,    setSelectedPay]    = useState<string>('paystack_card');
  const [activeGroup,    setActiveGroup]    = useState<string>('card');
  const [giftCode,       setGiftCode]       = useState('');
  const [giftPin,        setGiftPin]        = useState('');

  /* Step 3: processing */
  const [cart,           setCart]           = useState<CartSummary>({ items: [], subtotal: 0, count: 0 });
  const [paymentResult,  setPaymentResult]  = useState<any>(null);
  const [orderIds,       setOrderIds]       = useState<string[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [pageLoading,    setPageLoading]    = useState(true);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  /* ── Bootstrap data ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!token) { router.push('/auth/login'); return; }
    Promise.all([
      fetch('/api/delivery/addresses',  { headers }).then(r => r.json()),
      fetch('/api/delivery/modes',      { headers }).then(r => r.json()),
      fetch('/api/payment/methods',     { headers }).then(r => r.json()),
      fetch('/api/cart',                { headers }).then(r => r.json()),
    ]).then(([addrRes, modeRes, payRes, cartRes]) => {
      if (addrRes.success) {
        setAddresses(addrRes.data);
        const def = addrRes.data.find((a: Address) => a.is_default === 1);
        if (def) setSelectedAddr(def.id);
      }
      if (modeRes.success) setDeliveryModes(modeRes.data);
      if (payRes.success)  setPayMethods(payRes.data);
      if (cartRes.success) {
        const items    = cartRes.data?.items ?? [];
        const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
        setCart({ items, subtotal, count: items.length });
      }
      setPageLoading(false);
    });
  }, [token]);

  /* ── Helpers ────────────────────────────────────────────────────────────────── */
  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

  const deliveryFee = () => deliveryModes.find(m => m.id === selectedMode)?.fee ?? 500;
  const total       = () => cart.subtotal + deliveryFee();

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

  /* ── Step 1: Save address ──────────────────────────────────────────────────── */
  const saveAddress = async () => {
    if (!addrForm.recipient_name || !addrForm.address || !addrForm.city || !addrForm.recipient_phone) {
      toast.error('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/delivery/addresses', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(addrForm),
      });
      const data = await res.json();
      if (data.success) {
        setAddresses(prev => [data.data, ...prev]);
        setSelectedAddr(data.data.id);
        setShowNewAddr(false);
        toast.success('Address saved');
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to save address'); }
    setLoading(false);
  };

  /* ── Step 2 → 3: Place orders + initiate payment ──────────────────────────── */
  const placeOrder = async () => {
    if (!selectedAddr || cart.items.length === 0) {
      toast.error('Cart is empty or no address selected'); return;
    }
    setLoading(true);
    try {
      /* 1. Place orders (the orders route groups by vendor internally) */
      const addr = addresses.find(a => a.id === selectedAddr);
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          delivery_address:      addr?.address,
          delivery_city:         addr?.city,
          delivery_mode:         selectedMode,
          payment_method:        selectedPay,
          notes:                 addr?.delivery_instructions,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { toast.error(orderData.error); setLoading(false); return; }

      const ids = (orderData.data as any[]).map((o: any) => o.id);
      setOrderIds(ids);

      /* 2. Initiate payment for the first order (covers total) */
      const payRes = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          order_id: ids[0],
          amount:   total(),
          method:   selectedPay,
          currency: 'NGN',
        }),
      });
      const payData = await payRes.json();
      if (!payData.success) { toast.error(payData.error); setLoading(false); return; }

      setPaymentResult(payData.data);
      setStep(3);
      refreshCart();
    } catch (e: any) {
      toast.error(e.message || 'Order failed');
    }
    setLoading(false);
  };

  /* ── Step 3: Verify / redeem payment ─────────────────────────────────────── */
  const verifyPayment = async () => {
    if (!paymentResult) return;
    setLoading(true);
    try {
      let res, data;

      if (activeGroup === 'giftcard') {
        /* Gift card flow */
        res  = await fetch('/api/payment/giftcard', {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ payment_id: paymentResult.payment_id, code: giftCode, pin: giftPin }),
        });
        data = await res.json();
      } else {
        /* Card / bank / USSD / crypto flow */
        res  = await fetch('/api/payment/verify', {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ payment_id: paymentResult.payment_id, reference: paymentResult.reference }),
        });
        data = await res.json();
      }

      if (data.success) {
        toast.success('Payment confirmed! 🎉');
        setTimeout(() => router.push('/dashboard/customer/orders'), 2000);
      } else {
        toast.error(data.error || 'Payment verification failed');
      }
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  /* ── Loading / auth guard ──────────────────────────────────────────────────── */
  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="animate-spin text-orange-500" size={36} />
    </div>
  );
  if (!user) return null;

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/marketplace" className="hover:text-orange-600">Marketplace</Link>
            <ChevronRight size={14} />
            <span className="text-gray-800 font-medium">Checkout</span>
          </div>

          {/* Progress stepper */}
          <div className="flex items-center mb-8 bg-white rounded-2xl p-4 shadow-sm">
            {[
              { n: 1, label: 'Delivery' },
              { n: 2, label: 'Payment'  },
              { n: 3, label: 'Confirm'  },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {step > s.n ? <Check size={14} /> : s.n}
                  </div>
                  <span className={`font-medium text-sm ${step === s.n ? 'text-orange-600' : step > s.n ? 'text-green-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-3 ${step > s.n ? 'bg-green-300' : 'bg-gray-100'}`} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Main content ───────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* ═══ STEP 1: DELIVERY ════════════════════════════════════════════ */}
              {step === 1 && (
                <>
                  {/* Saved addresses */}
                  <section className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <MapPin size={18} className="text-orange-500" /> Delivery Address
                      </h2>
                      <button
                        onClick={() => setShowNewAddr(!showNewAddr)}
                        className="flex items-center gap-1 text-orange-600 text-sm font-medium hover:underline"
                      >
                        <Plus size={15} /> New Address
                      </button>
                    </div>

                    {/* New address form */}
                    {showNewAddr && (
                      <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Label</label>
                            <select className="input" value={addrForm.label}
                              onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}>
                              {['Home','Work','Other'].map(l => <option key={l}>{l}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Full Name *</label>
                            <input className="input" placeholder="Recipient name" value={addrForm.recipient_name}
                              onChange={e => setAddrForm(f => ({ ...f, recipient_name: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Phone *</label>
                            <input className="input" placeholder="+234…" value={addrForm.recipient_phone}
                              onChange={e => setAddrForm(f => ({ ...f, recipient_phone: e.target.value }))} />
                          </div>
                          <div>
                            <label className="label">City *</label>
                            <input className="input" placeholder="Lagos" value={addrForm.city}
                              onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label className="label">Address *</label>
                          <input className="input" placeholder="Street address" value={addrForm.address}
                            onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Delivery instructions (optional)</label>
                          <input className="input" placeholder="Gate colour, landmark…" value={addrForm.delivery_instructions}
                            onChange={e => setAddrForm(f => ({ ...f, delivery_instructions: e.target.value }))} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="setDefault" checked={addrForm.is_default}
                            onChange={e => setAddrForm(f => ({ ...f, is_default: e.target.checked }))} />
                          <label htmlFor="setDefault" className="text-sm text-gray-600">Set as default address</label>
                        </div>
                        <button onClick={saveAddress} disabled={loading}
                          className="btn-primary w-full flex items-center justify-center gap-2">
                          {loading && <Loader size={14} className="animate-spin" />} Save Address
                        </button>
                      </div>
                    )}

                    {/* Address cards */}
                    <div className="space-y-3">
                      {addresses.length === 0 && !showNewAddr && (
                        <p className="text-sm text-gray-400 text-center py-4">
                          No addresses saved. Add one above.
                        </p>
                      )}
                      {addresses.map(addr => (
                        <label key={addr.id}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedAddr === addr.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                          <input type="radio" name="address" value={addr.id}
                            checked={selectedAddr === addr.id}
                            onChange={() => setSelectedAddr(addr.id)}
                            className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-800">{addr.label}</span>
                              {addr.is_default === 1 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{addr.recipient_name} · {addr.recipient_phone}</p>
                            <p className="text-sm text-gray-500 truncate">{addr.address}, {addr.city}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </section>

                  {/* Delivery mode */}
                  <section className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Truck size={18} className="text-orange-500" /> Delivery Mode
                    </h2>
                    <div className="space-y-3">
                      {deliveryModes.map(mode => (
                        <label key={mode.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedMode === mode.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                          <input type="radio" name="mode" value={mode.id}
                            checked={selectedMode === mode.id}
                            onChange={() => setSelectedMode(mode.id)} />
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl
                            ${selectedMode === mode.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            {mode.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{mode.label}</p>
                            <p className="text-xs text-gray-500">{mode.description} · {mode.eta}</p>
                          </div>
                          <span className={`text-sm font-bold ${mode.fee === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                            {mode.fee === 0 ? 'FREE' : formatPrice(mode.fee)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <button
                    onClick={() => selectedAddr ? setStep(2) : toast.error('Select a delivery address')}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                    Continue to Payment <ArrowRight size={16} />
                  </button>
                </>
              )}

              {/* ═══ STEP 2: PAYMENT ══════════════════════════════════════════════ */}
              {step === 2 && (
                <>
                  <section className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <CreditCard size={18} className="text-orange-500" /> Payment Method
                    </h2>

                    {/* Group tabs */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {Object.entries(GROUP_META).map(([g, meta]) =>
                        payMethods.some(m => m.group === g) ? (
                          <button key={g}
                            onClick={() => {
                              setActiveGroup(g);
                              const first = payMethods.find(m => m.group === g);
                              if (first) setSelectedPay(first.id);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                              ${activeGroup === g
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {meta.icon} {meta.label}
                          </button>
                        ) : null
                      )}
                    </div>

                    {/* Methods in active group */}
                    <div className="space-y-2">
                      {payMethods.filter(m => m.group === activeGroup).map(m => (
                        <label key={m.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedPay === m.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                          <input type="radio" name="pay" value={m.id}
                            checked={selectedPay === m.id}
                            onChange={() => setSelectedPay(m.id)} />
                          <span className="text-xl">{m.icon}</span>
                          <span className="text-sm font-medium text-gray-800">{m.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Gift card extra fields */}
                    {activeGroup === 'giftcard' && (
                      <div className="mt-4 space-y-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                        <p className="text-sm font-medium text-yellow-800">Enter your gift card details</p>
                        <input className="input" placeholder="Gift card code (e.g. XXXX-XXXX-XXXX-XXXX)"
                          value={giftCode} onChange={e => setGiftCode(e.target.value)} />
                        <input className="input" placeholder="PIN (if applicable)"
                          value={giftPin} onChange={e => setGiftPin(e.target.value)} />
                      </div>
                    )}

                    {/* Crypto info */}
                    {activeGroup === 'crypto' && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                        <Shield size={14} className="inline mr-1" />
                        Crypto payments are processed via CoinGate. You&apos;ll receive wallet address and amount in the next step.
                        Exchange rates are locked for 30 minutes.
                      </div>
                    )}
                  </section>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2 px-6 py-3">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button onClick={placeOrder} disabled={loading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                      {loading ? <Loader size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                      Place Order {formatPrice(total())}
                    </button>
                  </div>
                </>
              )}

              {/* ═══ STEP 3: CONFIRMATION ════════════════════════════════════════ */}
              {step === 3 && paymentResult && (
                <section className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check size={28} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Order Placed!</h2>
                    <p className="text-gray-500 text-sm">
                      {orderIds.length} order{orderIds.length > 1 ? 's' : ''} created. Complete payment below.
                    </p>
                  </div>

                  {/* Card / bank / USSD → checkout URL */}
                  {(activeGroup === 'card' || activeGroup === 'bank' || activeGroup === 'ussd' || activeGroup === 'mobile') && (
                    <div className="space-y-4">
                      <a href={paymentResult.checkout_url} target="_blank" rel="noreferrer"
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm">
                        <CreditCard size={16} /> Proceed to {paymentResult.gateway === 'flutterwave' ? 'Flutterwave' : 'Paystack'} Checkout
                      </a>
                      <p className="text-xs text-gray-400">Reference: <code className="bg-gray-100 px-2 py-0.5 rounded">{paymentResult.reference || paymentResult.tx_ref}</code></p>
                      <button onClick={verifyPayment} disabled={loading}
                        className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm">
                        {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        I've completed payment – verify now
                      </button>
                    </div>
                  )}

                  {/* Crypto → wallet address */}
                  {activeGroup === 'crypto' && (
                    <div className="space-y-4 text-left">
                      <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-sm space-y-2">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Send to wallet</p>
                        <div className="flex items-center gap-2">
                          <span className="break-all text-xs">{paymentResult.wallet_address}</span>
                          <button onClick={() => { navigator.clipboard.writeText(paymentResult.wallet_address); toast.success('Copied!'); }}
                            className="shrink-0 text-gray-400 hover:text-green-300">
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <p className="text-yellow-300 font-bold text-lg">
                            {paymentResult.crypto_amount} {paymentResult.crypto_currency}
                          </p>
                          <p className="text-gray-400 text-xs">≈ {formatPrice(total())} · Rate: ₦{paymentResult.exchange_rate?.toLocaleString()}/unit</p>
                          <p className="text-gray-400 text-xs">Expires: {paymentResult.expires_at}</p>
                        </div>
                      </div>
                      <button onClick={verifyPayment} disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                        {loading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                        I've sent the crypto – verify now
                      </button>
                    </div>
                  )}

                  {/* Gift card form */}
                  {activeGroup === 'giftcard' && (
                    <div className="space-y-3 text-left">
                      <input className="input" placeholder="Gift card code"
                        value={giftCode} onChange={e => setGiftCode(e.target.value)} />
                      <input className="input" placeholder="PIN"
                        value={giftPin} onChange={e => setGiftPin(e.target.value)} />
                      <button onClick={verifyPayment} disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                        {loading ? <Loader size={14} className="animate-spin" /> : <Gift size={14} />}
                        Redeem Gift Card
                      </button>
                    </div>
                  )}

                  <Link href="/dashboard/customer/orders"
                    className="block text-sm text-orange-600 hover:underline">
                    View my orders →
                  </Link>
                </section>
              )}
            </div>

            {/* ── Order summary sidebar ─────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.items.map((item: any) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {item.product?.images?.[0]
                          ? <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📦</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.product?.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-50 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.count} items)</span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery fee</span>
                    <span className={deliveryFee() === 0 ? 'text-green-600 font-medium' : ''}>
                      {deliveryFee() === 0 ? 'FREE' : formatPrice(deliveryFee())}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 text-base pt-2 border-t border-gray-50">
                    <span>Total</span>
                    <span className="text-orange-600">{formatPrice(total())}</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="space-y-2.5 text-sm text-gray-600">
                  {[
                    { icon: '🔒', text: 'SSL secured checkout' },
                    { icon: '✅', text: 'Buyer protection guarantee' },
                    { icon: '🔄', text: '7-day easy returns' },
                    { icon: '📞', text: '24/7 customer support' },
                  ].map(b => (
                    <div key={b.text} className="flex items-center gap-2">
                      <span>{b.icon}</span> <span>{b.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
