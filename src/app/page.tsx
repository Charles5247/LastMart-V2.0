'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/ui/ProductCard';
import VendorCard from '@/components/ui/VendorCard';
import { MapPin, Clock, Shield, Star, ArrowRight, TrendingUp, Package, Truck, CheckCircle, ChevronRight, Zap, Search } from 'lucide-react';
import { useApp } from '@/components/AppContext';

export default function HomePage() {
  const { location } = useApp();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [featuredVendors, setFeaturedVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/products?featured=true&limit=8&city=${location.city}`).then(r => r.json()),
      fetch(`/api/vendors?limit=6&city=${location.city}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([products, vendors, cats]) => {
      if (products.success) setFeaturedProducts(products.data);
      if (vendors.success) setFeaturedVendors(vendors.data);
      if (cats.success) setCategories(cats.data);
      setLoading(false);
    });
  }, [location.city]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) window.location.href = `/marketplace?search=${encodeURIComponent(heroSearch)}`;
  };

  const stats = [
    { value: '2,000+', label: 'Active Vendors', icon: '🏪' },
    { value: '50,000+', label: 'Products Listed', icon: '📦' },
    { value: '48hrs', label: 'Max Delivery', icon: '🚀' },
    { value: '100K+', label: 'Happy Customers', icon: '😊' },
  ];

  const features = [
    { icon: MapPin, title: 'Location-Based', desc: 'Only see vendors in your city for faster delivery', color: 'from-orange-400 to-red-500' },
    { icon: Clock, title: '48hr Delivery', desc: 'Guaranteed delivery within 48 hours of ordering', color: 'from-blue-400 to-purple-500' },
    { icon: Shield, title: 'Secure Payments', desc: 'Safe and encrypted payment processing', color: 'from-green-400 to-teal-500' },
    { icon: Star, title: 'Verified Vendors', desc: 'All vendors are verified and approved', color: 'from-yellow-400 to-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-orange-900 to-pink-900 overflow-hidden min-h-[85vh] flex items-center">
        {/* Animated BG */}
        <div className="absolute inset-0">
          <div className="absolute w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse" />
          <div className="absolute w-80 h-80 bg-pink-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-1000" />
          <div className="absolute w-64 h-64 bg-purple-500/20 rounded-full blur-3xl top-40 right-40 animate-pulse delay-500" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm text-orange-200 text-sm font-medium px-4 py-2 rounded-full mb-6 border border-white/20">
              <Zap className="w-4 h-4 mr-2" /> Nigeria's #1 Local Marketplace
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
              Shop Local,<br />
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">Delivered Fast</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Connect with trusted vendors in <strong className="text-orange-300">{location.city}</strong> and get your products delivered within 48 hours. Support local businesses while enjoying the convenience of online shopping.
            </p>

            {/* Search */}
            <form onSubmit={handleHeroSearch} className="flex bg-white rounded-2xl p-2 shadow-2xl max-w-lg mb-8">
              <div className="flex items-center px-3 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
                placeholder="Search for products or vendors..."
                className="flex-1 px-2 py-3 text-gray-800 focus:outline-none text-sm"
              />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-4">
              <Link href="/marketplace" className="flex items-center bg-gradient-to-r from-orange-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg">
                <Package className="w-5 h-5 mr-2" /> Shop Now
              </Link>
              <Link href="/auth/register?role=vendor" className="flex items-center bg-white/10 backdrop-blur-sm text-white border border-white/30 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all">
                Start Selling <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-r from-orange-500 to-pink-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-orange-100 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-800">Shop by Category</h2>
            <p className="text-gray-500 mt-2">Find exactly what you need from local vendors</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/marketplace?category_id=${cat.id}`} className="bg-white rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100">
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="text-xs font-semibold text-gray-700">{cat.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-800">Top Vendors Near You</h2>
              <p className="text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4 text-orange-500" />{location.city}</p>
            </div>
            <Link href="/marketplace?view=vendors" className="flex items-center text-orange-500 font-semibold hover:text-orange-600 transition-colors">
              See All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-60 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : featuredVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVendors.map(v => <VendorCard key={v.id} vendor={v} />)}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">No vendors found in {location.city}. <Link href="/marketplace" className="text-orange-500">Browse all vendors</Link></p>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-800">Featured Products</h2>
              <p className="text-gray-500 mt-1">Handpicked deals from local vendors</p>
            </div>
            <Link href="/marketplace" className="flex items-center text-orange-500 font-semibold hover:text-orange-600 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="h-72 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">No products yet. <Link href="/marketplace" className="text-orange-500">Browse all products</Link></p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-800">Why Choose LastMart?</h2>
            <p className="text-gray-500 mt-2">We make local shopping simple, fast and reliable</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat) => (
              <div key={feat.title} className="text-center group">
                <div className={`w-16 h-16 bg-gradient-to-br ${feat.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feat.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-800">How LastMart Works</h2>
            <p className="text-gray-500 mt-2">Start shopping in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: MapPin, title: 'Choose Your City', desc: 'Set your location to discover vendors and products near you' },
              { step: '02', icon: Package, title: 'Add to Cart', desc: 'Browse and add your favorite products from local vendors' },
              { step: '03', icon: Truck, title: 'Get Delivered', desc: 'Receive your order within 48 hours from local vendors' },
            ].map((step) => (
              <div key={step.step} className="bg-white rounded-3xl p-8 text-center shadow-sm hover:shadow-lg transition-shadow">
                <div className="text-6xl font-black text-orange-100 mb-4">{step.step}</div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto -mt-8 mb-4 shadow-lg">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 text-xl mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-orange-900 to-pink-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready to Start Selling?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of vendors who are growing their business on LastMart.
            Create your store today and reach customers in your city.
          </p>
          <Link href="/auth/register?role=vendor" className="inline-flex items-center bg-gradient-to-r from-orange-500 to-pink-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:opacity-90 transition-all hover:scale-105 shadow-xl">
            Create Your Store <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
