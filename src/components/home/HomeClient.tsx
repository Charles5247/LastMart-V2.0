"use client";
/**
 * ─── HomeClient ───────────────────────────────────────────────────────────────
 * All interactive / client-side parts of the homepage:
 *  - Hero slider with auto-advance
 *  - Location-aware product/vendor fetching
 *  - Category grid (from SSR props + client interaction)
 *
 * Receives initial static data from the Server Component (page.tsx) via props,
 * so the page renders meaningfully on first paint even without JS.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import VendorCard from "@/components/ui/VendorCard";
import { useApp } from "@/components/AppContext";
import { Category, Product, Vendor } from "@/types";
import {
  MapPin,
  ArrowRight,
  ChevronRight,
  Zap,
  Package,
  Truck,
  Shield,
  Clock,
  Star,
  RotateCcw,
  Headphones,
  Tag,
  Flame,
  Users,
  TrendingUp,
  CheckCircle,
  Store,
  Bike,
} from "lucide-react";

const VENDOR_URL =
  process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://lastmart-vendor.onrender.com";
const RIDER_URL =
  process.env.NEXT_PUBLIC_RIDER_URL ?? "https://lastmart-rider.onrender.com";

/* ─── Static data ────────────────────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    title: "Shop Local, Delivered Fast",
    sub: "Discover thousands of products from verified vendors in your city",
    cta: "Shop Now",
    href: "/marketplace",
    bg: "from-orange-600 via-orange-500 to-amber-400",
    badge: "Nigeria's #1 Local Market",
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&auto=format&fit=crop",
  },
  {
    title: "Support Local Businesses",
    sub: "Every purchase supports a local entrepreneur in your community",
    cta: "Find Vendors",
    href: "/marketplace?view=vendors",
    bg: "from-rose-600 via-pink-500 to-orange-400",
    badge: "1000+ Verified Vendors",
    image:
      "https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=800&auto=format&fit=crop",
  },
  {
    title: "Start Selling Today",
    sub: "Join thousands of entrepreneurs growing their business on LastMart",
    cta: "Open Your Store",
    href: "/sell",
    bg: "from-indigo-600 via-purple-500 to-pink-400",
    badge: "Free to Start",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop",
  },
];

const TRUST_BADGES = [
  { icon: Truck, label: "48hr Delivery", sub: "All cities covered" },
  { icon: Shield, label: "Buyer Protection", sub: "Money-back guarantee" },
  { icon: RotateCcw, label: "Easy Returns", sub: "Hassle-free process" },
  { icon: Headphones, label: "24/7 Support", sub: "Always here to help" },
];

const METRICS = [
  {
    icon: Users,
    value: "0",
    label: "Happy Customers",
    color: "text-blue-600",
  },
  {
    icon: CheckCircle,
    value: "0",
    label: "Verified Vendors",
    color: "text-green-600",
  },
  {
    icon: Package,
    value: "0",
    label: "Products Listed",
    color: "text-purple-600",
  },
  {
    icon: TrendingUp,
    value: "0",
    label: "Cities Covered",
    color: "text-orange-600",
  },
];

/* ─── Props ─────────────────────────────────────────────────────────────────── */
interface HomeClientProps {
  initialCategories: Category[];
}

export default function HomeClient({ initialCategories }: HomeClientProps) {
  const { location, user, isLoading } = useApp();

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  /* Redirect admin/vendor */
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") {
        window.location.replace("/admin/dashboard");
        return;
      }
      if (user.role === "vendor") {
        window.location.replace("/vendor/dashboard");
        return;
      }
    }
  }, [user, isLoading]);

  /* Hero auto-advance */
  useEffect(() => {
    const t = setInterval(
      () => setSlide((s) => (s + 1) % HERO_SLIDES.length),
      4500,
    );
    return () => clearInterval(t);
  }, []);

  /* Location-aware data fetch */
  useEffect(() => {
    const city = location.city;
    setLoading(true);
    Promise.all([
      fetch(`/api/products?featured=true&limit=10&city=${city}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/products?limit=8&city=${city}`).then((r) => r.json()),
      fetch(`/api/vendors?limit=6&city=${city}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([feat, deals, vendors, cats]) => {
        if (feat.success) setFeaturedProducts(feat.data ?? []);
        if (deals.success) setDealProducts(deals.data ?? []);
        if (vendors.success) setFeaturedVendors(vendors.data ?? []);
        if (cats.success) setCategories(cats.data ?? initialCategories);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [location.city]); // eslint-disable-line

  const cur = HERO_SLIDES[slide];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      {/* ─── Metrics bar ─────────────────────────────────────────────────── */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-orange-500/40 py-2">
            {METRICS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-2 px-4 py-2"
              >
                <Icon className="w-4 h-4 text-orange-200 hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-sm font-black leading-none">{value}</p>
                  <p className="text-xs text-orange-200 leading-none mt-0.5">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Hero + category sidebar ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex gap-4">
          {/* Category sidebar – desktop only */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="panel overflow-hidden">
              <div className="px-4 py-3 bg-gray-800 text-white text-sm font-semibold">
                All Categories
              </div>
              {categories.length > 0
                ? categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/marketplace?category_id=${cat.id}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <span className="text-base leading-none">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300" />
                    </Link>
                  ))
                : [...Array(8)].map((_, i) => (
                    <div key={i} className="mx-4 my-2 h-5 skeleton" />
                  ))}
            </nav>
          </aside>

          {/* Hero banner */}
          <div className="flex-1 relative rounded-xl overflow-hidden min-h-70 md:min-h-85">
            <div
              className={`absolute inset-0 bg-linear-to-r ${cur.bg} transition-all duration-700`}
            />
            {cur.image && (
              <img
                src={cur.image}
                alt={cur.title}
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
              />
            )}
            <div className="relative h-full flex flex-col justify-center px-8 md:px-12 py-10 max-w-lg">
              <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 w-fit backdrop-blur-sm">
                <Zap className="w-3.5 h-3.5" /> {cur.badge}
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                {cur.title}
              </h2>
              <p className="text-white/80 text-sm md:text-base mb-6 leading-relaxed">
                {cur.sub}
              </p>
              <Link
                href={cur.href}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold text-sm px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors w-fit shadow-lg"
              >
                {cur.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Slide dots */}
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === slide ? "bg-white w-6" : "bg-white/50 w-2"}`}
                />
              ))}
            </div>
          </div>

          {/* Side promo banners – desktop */}
          <div className="hidden xl:flex flex-col gap-3 w-48 shrink-0">
            <div className="panel flex-1 overflow-hidden relative flex flex-col items-center justify-center text-center p-4 bg-linear-to-br from-blue-50 to-indigo-100">
              <Package className="w-8 h-8 text-indigo-500 mb-2" />
              <p className="text-sm font-bold text-gray-800">New Arrivals</p>
              <p className="text-xs text-gray-500 mt-1">
                Fresh products added daily
              </p>
              <Link
                href="/marketplace"
                className="mt-3 text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Shop <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="panel flex-1 overflow-hidden relative flex flex-col items-center justify-center text-center p-4 bg-linear-to-br from-orange-50 to-amber-100">
              <Flame className="w-8 h-8 text-orange-500 mb-2" />
              <p className="text-sm font-bold text-gray-800">Hot Deals</p>
              <p className="text-xs text-gray-500 mt-1">
                Limited-time offers today
              </p>
              <Link
                href="/marketplace"
                className="mt-3 text-xs font-semibold text-orange-600 hover:underline flex items-center gap-1"
              >
                View <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Trust badges ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="panel">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Categories grid ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="panel">
          <div className="section-header">
            <span className="section-title flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-500" /> Shop by Category
            </span>
            <Link
              href="/marketplace"
              className="section-see-all flex items-center gap-1"
            >
              All categories <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-0 divide-x divide-y divide-gray-100">
            {loading
              ? [...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-4">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="skeleton w-14 h-3 rounded" />
                  </div>
                ))
              : categories.slice(0, 8).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/marketplace?category_id=${cat.id}`}
                    className="flex flex-col items-center gap-2 p-4 hover:bg-orange-50 transition-colors group"
                  >
                    <span className="text-3xl leading-none group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </span>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-orange-600 transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ─── Featured products ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="panel">
          <div className="section-header">
            <span className="section-title flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> Featured Products
            </span>
            <Link
              href="/marketplace"
              className="section-see-all flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="skeleton aspect-square rounded-md" />
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No products in {location.city} yet.</p>
                <Link
                  href="/marketplace"
                  className="text-orange-500 text-sm mt-1 hover:underline"
                >
                  Browse all products
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Top vendors ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="panel">
          <div className="section-header">
            <span className="section-title flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              Top Vendors in{" "}
              <span className="text-orange-500 ml-1">{location.city}</span>
            </span>
            <Link
              href="/marketplace?view=vendors"
              className="section-see-all flex items-center gap-1"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="skeleton h-28 rounded-lg" />
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : featuredVendors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredVendors.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No vendors found in {location.city}.</p>
                <Link
                  href="/marketplace?view=vendors"
                  className="text-orange-500 text-sm mt-1 hover:underline"
                >
                  Browse all vendors
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── More deals ──────────────────────────────────────────────────── */}
      {dealProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="panel">
            <div className="section-header">
              <span className="section-title flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500" /> More Products
              </span>
              <Link
                href="/marketplace"
                className="section-see-all flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {dealProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── How it works ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-8">
        <div className="panel">
          <div className="section-header">
            <span className="section-title">How LastMart Works</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: "1",
                icon: MapPin,
                title: "Set Your Location",
                desc: "Enter your city to see local vendors and products available near you.",
              },
              {
                n: "2",
                icon: Package,
                title: "Browse & Order",
                desc: "Find what you need, add to cart, and place your order with a few clicks.",
              },
              {
                n: "3",
                icon: Clock,
                title: "Get it in 48hrs",
                desc: "Your local vendor prepares your order and delivers it within 48 hours.",
              },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 font-black text-xl flex items-center justify-center shrink-0">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Trust & Guarantees section ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="panel overflow-hidden">
          <div className="section-header">
            <span className="section-title flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" /> Our Guarantees to
              You
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              {
                icon: "🔒",
                title: "Secure Payments",
                desc: "Every transaction is encrypted and protected. We never store card details.",
              },
              {
                icon: "✅",
                title: "Verified Vendors",
                desc: "Every vendor goes through KYC verification before selling on LastMart.",
              },
              {
                icon: "🔄",
                title: "7-Day Returns",
                desc: "Not satisfied? Return it within 7 days. No questions, no hassle.",
              },
              {
                icon: "📞",
                title: "24/7 Support",
                desc: "Our support team is available around the clock via WhatsApp or email.",
              },
            ].map((g) => (
              <div key={g.title} className="p-6 text-center">
                <div className="text-4xl mb-3">{g.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{g.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {g.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Become a Vendor / Become a Rider dual CTA ──────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Vendor CTA */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-orange-600 to-amber-500 p-8 flex flex-col justify-between min-h-[220px] relative">
            <div className="absolute top-4 right-4 opacity-10">
              <Store className="w-28 h-28 text-white" />
            </div>
            <div>
              <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                For Business Owners
              </span>
              <h2 className="text-2xl font-black text-white mb-2 leading-tight">
                Become a Vendor
              </h2>
              <p className="text-orange-100 text-sm max-w-xs">
                Open your online store and reach thousands of customers in your
                city. Free to start — no listing fees.
              </p>
            </div>
            <div className="flex gap-3 mt-6 flex-wrap">
              <a
                href={`${VENDOR_URL}/auth/register`}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors whitespace-nowrap shadow-md"
              >
                Open Your Store <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`${VENDOR_URL}/auth/login`}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
              >
                Vendor Login
              </a>
            </div>
          </div>

          {/* Rider CTA */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 to-emerald-500 p-8 flex flex-col justify-between min-h-[220px] relative">
            <div className="absolute top-4 right-4 opacity-10">
              <Bike className="w-28 h-28 text-white" />
            </div>
            <div>
              <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                For Delivery Partners
              </span>
              <h2 className="text-2xl font-black text-white mb-2 leading-tight">
                Become a Rider
              </h2>
              <p className="text-green-100 text-sm max-w-xs">
                Earn money on your own schedule by delivering orders in your
                city. Flexible hours, daily payouts.
              </p>
            </div>
            <div className="flex gap-3 mt-6 flex-wrap">
              <a
                href={`${RIDER_URL}/auth/register`}
                className="inline-flex items-center gap-2 bg-white text-green-600 font-black text-sm px-6 py-3 rounded-xl hover:bg-green-50 transition-colors whitespace-nowrap shadow-md"
              >
                Start Delivering <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`${RIDER_URL}/auth/login`}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
              >
                Rider Login
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
