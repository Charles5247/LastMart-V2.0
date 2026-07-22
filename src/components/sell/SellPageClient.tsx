"use client";
/**
 * ─── SellPageClient ───────────────────────────────────────────────────────────
 * All interactive sections of the /sell vendor landing page.
 * Kept as a single client component to avoid over-splitting small interactive
 * pieces (accordion, revenue calculator slider).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Store,
  Package,
  TrendingUp,
  Zap,
  Shield,
  Headphones,
  BarChart2,
  Smartphone,
  Globe,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  DollarSign,
  Clock,
  Truck,
  Tag,
  CreditCard,
  Bell,
  Layers,
  Award,
  MapPin,
  Check,
} from "lucide-react";

/* ─── Metrics ────────────────────────────────────────────────────────────── */
const METRICS = [
  { value: "0", label: "Active Customers", icon: Users },
  { value: "0", label: "Verified Vendors", icon: Store },
  { value: "0", label: "Cities Covered", icon: MapPin },
  { value: "0", label: "Total Sales Volume", icon: TrendingUp },
];

/* ─── How it works ───────────────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Store,
    title: "Create Your Store",
    desc: "Register in 5 minutes. Add your store name, category, and location. Our KYC team approves accounts within 24 hours.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    step: "02",
    icon: Package,
    title: "List Your Products",
    desc: "Upload unlimited products with photos, descriptions, and prices. Manage your inventory easily from any device.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Grow Your Sales",
    desc: "Reach 50,000+ customers in your city and beyond. Get real-time order notifications and analytics to scale your business.",
    color: "bg-green-100 text-green-600",
  },
];

/* ─── Feature grid ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: BarChart2,
    title: "Real-time Analytics",
    desc: "Track sales, revenue, and customer insights with beautiful dashboards.",
  },
  {
    icon: Bell,
    title: "Instant Order Alerts",
    desc: "Get notified instantly via SMS, WhatsApp, and in-app when new orders arrive.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first Dashboard",
    desc: "Manage your store from your phone. Accept orders even without a laptop.",
  },
  {
    icon: CreditCard,
    title: "Fast Payouts",
    desc: "Funds are settled within 24–48 hours directly to your bank account.",
  },
  {
    icon: Globe,
    title: "City-wide Reach",
    desc: "Show up in search results for customers across your city and nearby areas.",
  },
  {
    icon: Layers,
    title: "Bulk Product Upload",
    desc: "Upload hundreds of products at once via CSV. Save hours of manual work.",
  },
  {
    icon: Shield,
    title: "Dispute Protection",
    desc: "Vendor-friendly dispute resolution. We protect legitimate sellers too.",
  },
  {
    icon: Tag,
    title: "Promotions & Coupons",
    desc: "Run sales, create coupon codes, and boost visibility with paid ads.",
  },
];

/* ─── Pricing tiers ──────────────────────────────────────────────────────── */
const PRICING = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    highlight: false,
    badge: null,
    description: "Perfect for side-hustles and first-time sellers",
    features: [
      "Up to 20 product listings",
      "Basic analytics",
      "Standard customer support",
      "Paystack & bank transfer payouts",
      "5% transaction fee",
    ],
    cta: "Start for Free",
    href: "/auth/register?role=vendor&plan=starter",
  },
  {
    name: "Growth",
    price: "₦5,000",
    period: "/ month",
    highlight: true,
    badge: "Most Popular",
    description: "For growing businesses ready to scale",
    features: [
      "Unlimited product listings",
      "Advanced analytics & reports",
      "Priority customer support",
      "All payment methods",
      "3% transaction fee",
      "Promotional tools & coupons",
      "Featured vendor badge",
    ],
    cta: "Start Free Trial",
    href: "/auth/register?role=vendor&plan=growth",
  },
  {
    name: "Pro",
    price: "₦15,000",
    period: "/ month",
    highlight: false,
    badge: null,
    description: "Maximum exposure for serious businesses",
    features: [
      "Everything in Growth",
      "1.5% transaction fee",
      "Sponsored product placements",
      "Dedicated account manager",
      "API access for integrations",
      "Custom store URL",
      "Bulk order management",
    ],
    cta: "Go Pro",
    href: "/auth/register?role=vendor&plan=pro",
  },
];

/* ─── FAQ ────────────────────────────────────────────────────────────────── */
const FAQ = [
  {
    q: "How long does vendor approval take?",
    a: "Most accounts are approved within 24 hours. You'll need to provide a valid government ID, a phone number, and your business location. You can start listing products while your approval is in review.",
  },
  {
    q: "What products can I sell on LastMart?",
    a: "You can sell physical products across all categories including Electronics, Fashion, Food & Groceries, Health & Beauty, Home & Living, and more. Digital products and services are coming soon.",
  },
  {
    q: "How and when do I get paid?",
    a: "Payouts are processed every 24–48 hours after order delivery confirmation. Funds are sent directly to your registered bank account. Minimum payout threshold is ₦1,000.",
  },
  {
    q: "What happens if a customer disputes an order?",
    a: "We have a fair dispute resolution process. Vendors are notified immediately and given 48 hours to respond with evidence. LastMart mediates to reach a fair resolution for both parties.",
  },
  {
    q: "Can I sell in multiple cities?",
    a: "Yes! You can set your delivery radius to cover multiple cities and states. Customers filter by location, so your products will appear in all cities within your delivery coverage.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No hidden fees. You only pay the listed transaction fee per sale, plus your optional monthly subscription (Growth/Pro). Listing products is always free on the Starter plan.",
  },
];

/* ─── Testimonials ───────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Tunde Adeyemi",
    store: "Tunde Electronics",
    city: "Lagos",
    avatar: "T",
    rating: 5,
    revenue: "₦850,000/mo",
    text: "I was selling on Instagram with no structure. LastMart gave me a real store, real analytics, and real customers. My revenue tripled in 4 months.",
  },
  {
    name: "Ngozi Okafor",
    store: "Ngozi Fashion Hub",
    city: "Enugu",
    avatar: "N",
    rating: 5,
    revenue: "₦420,000/mo",
    text: "The mobile dashboard is everything. I manage orders from my phone between school runs. The payouts hit my account within a day — that trust is priceless.",
  },
  {
    name: "Alhaji Musa",
    store: "Kano Spices & More",
    city: "Kano",
    avatar: "M",
    rating: 5,
    revenue: "₦620,000/mo",
    text: "LastMart helped me reach customers I could never find in my market. The verification badge made customers trust my store instantly.",
  },
];

/* ─── Revenue Calculator ─────────────────────────────────────────────────── */
function RevenueCalculator() {
  const [products, setProducts] = useState(20);
  const [avgPrice, setAvgPrice] = useState(3500);
  const [ordersPerDay, setOrdersPerDay] = useState(5);

  const monthlyRevenue = ordersPerDay * avgPrice * 30;
  const annualRevenue = monthlyRevenue * 12;
  const lastmartFee = monthlyRevenue * 0.03; // Growth tier
  const netMonthly = monthlyRevenue - lastmartFee - 5000; // minus plan fee

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="panel p-6 sm:p-8">
      <h3 className="text-xl font-black text-gray-800 mb-2">
        Revenue Calculator
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Estimate your monthly earnings on LastMart
      </p>

      <div className="space-y-6">
        {/* Products slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Number of products listed
            </label>
            <span className="text-sm font-black text-orange-600">
              {products}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={500}
            step={5}
            value={products}
            onChange={(e) => setProducts(+e.target.value)}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>500</span>
          </div>
        </div>

        {/* Avg price slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Average product price
            </label>
            <span className="text-sm font-black text-orange-600">
              {fmt(avgPrice)}
            </span>
          </div>
          <input
            type="range"
            min={500}
            max={100000}
            step={500}
            value={avgPrice}
            onChange={(e) => setAvgPrice(+e.target.value)}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>₦500</span>
            <span>₦100,000</span>
          </div>
        </div>

        {/* Orders per day slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Estimated orders per day
            </label>
            <span className="text-sm font-black text-orange-600">
              {ordersPerDay} orders
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={ordersPerDay}
            onChange={(e) => setOrdersPerDay(+e.target.value)}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1/day</span>
            <span>100/day</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Monthly Revenue</p>
          <p className="text-xl font-black text-orange-600">
            {fmt(monthlyRevenue)}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Net After Fees (Growth)</p>
          <p className="text-xl font-black text-green-600">
            {fmt(Math.max(0, netMonthly))}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        * Estimate based on Growth plan (3% fee + ₦5,000/mo). Actual results
        vary.
      </p>

      <Link
        href="/auth/register?role=vendor"
        className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2"
      >
        Start Earning <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

/* ─── FAQ accordion ──────────────────────────────────────────────────────── */
function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {FAQ.map((item, i) => (
        <div key={i} className="panel overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            aria-expanded={open === i}
          >
            <span className="font-semibold text-gray-800 text-sm pr-4">
              {item.q}
            </span>
            {open === i ? (
              <ChevronUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </button>
          {open === i && (
            <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3 animate-fade-in">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main page component ────────────────────────────────────────────────── */
export default function SellPageClient() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main>
        {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, #f97316 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: copy */}
              <div>
                <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-orange-500/30">
                  <Zap className="w-3 h-3" /> Join 1,200+ Verified Vendors
                </span>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                  Turn Your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
                    Passion
                  </span>{" "}
                  Into a<br />
                  Thriving Business
                </h1>

                <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-lg">
                  Open your free store on LastMart in minutes. Reach{" "}
                  <strong className="text-white">
                    50,000+ active customers
                  </strong>{" "}
                  across Nigeria and start earning — with zero listing fees.
                </p>

                {/* Key benefits checklist */}
                <ul className="space-y-2.5 mb-10">
                  {[
                    "Free to start — no setup fees",
                    "Get approved in under 24 hours",
                    "Sell to customers in your city & beyond",
                    "Payouts in 24–48 hours to your bank",
                  ].map((b) => (
                    <li
                      key={b}
                      className="flex items-center gap-2.5 text-gray-300 text-sm"
                    >
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/auth/register?role=vendor"
                    className="btn-primary px-8 py-4 text-base font-bold"
                  >
                    Open Your Free Store <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-lg text-base transition-colors text-center"
                  >
                    See How It Works
                  </a>
                </div>

                <p className="text-gray-500 text-xs mt-4">
                  No credit card required · Cancel subscription anytime · Free
                  Starter plan forever
                </p>
              </div>

              {/* Right: mock dashboard card */}
              <div className="hidden lg:block">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-4">
                  {/* Mock store header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                      T
                    </div>
                    <div>
                      <p className="text-white font-bold">Tunde Electronics</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />{" "}
                        Verified Vendor · Lagos
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium border border-green-500/30">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Mock stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Today's Sales",
                        value: "₦47,500",
                        icon: DollarSign,
                        color: "text-green-400",
                      },
                      {
                        label: "New Orders",
                        value: "12",
                        icon: Package,
                        color: "text-blue-400",
                      },
                      {
                        label: "Customers",
                        value: "284",
                        icon: Users,
                        color: "text-purple-400",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-white/5 rounded-2xl p-3 text-center"
                      >
                        <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                        <p className={`text-lg font-black ${s.color}`}>
                          {s.value}
                        </p>
                        <p className="text-gray-400 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mock recent orders */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                      Recent Orders
                    </p>
                    {[
                      {
                        product: "Samsung Galaxy A54",
                        price: "₦185,000",
                        status: "new",
                        statusColor: "bg-blue-500/20 text-blue-400",
                      },
                      {
                        product: "Wireless Earbuds Pro",
                        price: "₦22,500",
                        status: "confirmed",
                        statusColor: "bg-green-500/20 text-green-400",
                      },
                      {
                        product: "Power Bank 20,000mAh",
                        price: "₦8,500",
                        status: "shipped",
                        statusColor: "bg-yellow-500/20 text-yellow-400",
                      },
                    ].map((o) => (
                      <div
                        key={o.product}
                        className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                      >
                        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 text-xs">
                          📦
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">
                            {o.product}
                          </p>
                          <p className="text-gray-400 text-xs">{o.price}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.statusColor}`}
                        >
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mock revenue chart placeholder */}
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-orange-500 to-orange-300 rounded-sm opacity-80"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-2 text-center">
                      Monthly revenue trend ↗ +47%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          METRICS BAR
      ════════════════════════════════════════════════════════════════════ */}
        <section className="bg-orange-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-orange-400 py-3">
              {METRICS.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-center gap-3 px-4 py-3"
                >
                  <Icon className="w-5 h-5 text-orange-200 hidden sm:block" />
                  <div className="text-center sm:text-left">
                    <p className="text-xl font-black leading-none">{value}</p>
                    <p className="text-xs text-orange-200 leading-none mt-0.5">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20"
        >
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-3">
              Start Selling in 3 Easy Steps
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From registration to your first sale — our onboarding is designed
              to get you live as quickly as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[calc(100%-12px)] w-8 h-0.5 bg-gray-200 z-10" />
                )}
                <div className="panel p-6 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center flex-shrink-0`}
                    >
                      <step.icon className="w-8 h-8" />
                    </div>
                    <div className="text-5xl font-black text-gray-100 leading-none mt-1">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="font-black text-gray-800 text-xl mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/auth/register?role=vendor"
              className="btn-primary px-10 py-3.5 text-base"
            >
              Get Started Now <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          REVENUE CALCULATOR + TESTIMONIALS
      ════════════════════════════════════════════════════════════════════ */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Calculator */}
              <div>
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                  Earning Potential
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-2 mb-6">
                  How Much Can You Earn?
                </h2>
                <RevenueCalculator />
              </div>

              {/* Testimonials */}
              <div>
                <span className="text-xs font-bold text-green-600 uppercase tracking-widest">
                  Success Stories
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-2 mb-6">
                  Real Vendors, Real Results
                </h2>
                <div className="space-y-4">
                  {TESTIMONIALS.map((t) => (
                    <div key={t.name} className="panel p-5">
                      <div className="flex gap-0.5 mb-3">
                        {[...Array(t.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 text-yellow-400 fill-yellow-400"
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-700 italic leading-relaxed mb-4">
                        &ldquo;{t.text}&rdquo;
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {t.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {t.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t.store} · {t.city}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-green-600">
                            {t.revenue}
                          </p>
                          <p className="text-xs text-gray-400">avg monthly</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
              Platform Features
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-3">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A complete toolkit built specifically for Nigerian market sellers
              — not a generic global platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="panel p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════════════════════════ */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                Transparent Pricing
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-3">
                Simple, Honest Plans
              </h2>
              <p className="text-gray-500">
                Start free. Upgrade when you're ready. No hidden charges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PRICING.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 flex flex-col transition-all
                  ${
                    plan.highlight
                      ? "bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-2xl shadow-orange-500/30 scale-105"
                      : "panel hover:shadow-md"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full shadow-sm">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3
                      className={`font-black text-xl mb-1 ${plan.highlight ? "text-white" : "text-gray-800"}`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-xs mb-4 ${plan.highlight ? "text-orange-100" : "text-gray-500"}`}
                    >
                      {plan.description}
                    </p>
                    <div className="flex items-end gap-1">
                      <span
                        className={`text-4xl font-black leading-none ${plan.highlight ? "text-white" : "text-gray-900"}`}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span
                          className={`text-sm pb-1 ${plan.highlight ? "text-orange-200" : "text-gray-400"}`}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-orange-50" : "text-gray-600"}`}
                      >
                        <CheckCircle
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-orange-200" : "text-green-500"}`}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`w-full text-center py-3 rounded-lg font-bold text-sm transition-all
                    ${
                      plan.highlight
                        ? "bg-white text-orange-600 hover:bg-orange-50 shadow-lg"
                        : "btn-primary"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              All plans include buyer protection, SSL security, and access to
              the LastMart vendor community.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          FAQ
      ════════════════════════════════════════════════════════════════════ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
              FAQ
            </span>
            <h2 className="text-3xl font-black text-gray-900 mt-2 mb-3">
              Common Questions
            </h2>
          </div>
          <FaqAccordion />
          <p className="text-center text-sm text-gray-500 mt-8">
            Still have questions?{" "}
            <a
              href="https://wa.me/2348100000000?text=Hi!%20I%20want%20to%20know%20more%20about%20selling%20on%20LastMart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 font-semibold hover:underline"
            >
              Chat with us on WhatsApp →
            </a>
          </p>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-r from-gray-900 to-gray-800 py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Your Store is One Click Away
            </h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Join Nigeria's fastest-growing marketplace. Start free, grow with
              confidence, and reach customers who are ready to buy.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/register?role=vendor"
                className="btn-primary px-10 py-4 text-base font-bold"
              >
                Open Your Free Store <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/marketplace"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-lg text-base transition-colors"
              >
                Explore the Marketplace
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8">
              {[
                { icon: Award, text: "Certified Marketplace" },
                { icon: Shield, text: "Vendor Protection" },
                { icon: Clock, text: "24hr Support" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 text-gray-400 text-xs"
                >
                  <Icon className="w-3.5 h-3.5 text-orange-400" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
