'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/ui/ProductCard';
import VendorCard from '@/components/ui/VendorCard';
import { Search, Filter, X, SlidersHorizontal, Store, Package, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/components/AppContext';

function MarketplaceContent() {
  const { location } = useApp();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('view') === 'vendors' ? 'vendors' : 'products');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    city: location.city,
    min_price: '',
    max_price: '',
    sponsored: false,
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setFilters(f => ({ ...f, city: location.city }));
  }, [location.city]);

  useEffect(() => { fetchData(1); }, [filters, activeTab]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const params = new URLSearchParams({
          page: String(page), limit: '12',
          ...(filters.search && { search: filters.search }),
          ...(filters.category_id && { category_id: filters.category_id }),
          ...(filters.city && { city: filters.city }),
          ...(filters.min_price && { min_price: filters.min_price }),
          ...(filters.max_price && { max_price: filters.max_price }),
          ...(filters.sponsored && { sponsored: 'true' }),
        });
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        if (data.success) { setProducts(data.data); setPagination({ page, total: data.pagination.total, totalPages: data.pagination.totalPages }); }
      } else {
        const params = new URLSearchParams({
          page: String(page), limit: '12',
          ...(filters.search && { search: filters.search }),
          ...(filters.city && { city: filters.city }),
        });
        const res = await fetch(`/api/vendors?${params}`);
        const data = await res.json();
        if (data.success) { setVendors(data.data); setPagination({ page, total: data.pagination.total, totalPages: data.pagination.totalPages }); }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchData(1); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black text-white mb-2">Marketplace</h1>
          <p className="text-orange-100 flex items-center gap-1"><MapPin className="w-4 h-4" /> Showing results for <strong>{filters.city}</strong></p>
          
          {/* Tabs */}
          <div className="flex mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-1 w-fit">
            <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'products' ? 'bg-white text-orange-600' : 'text-white'}`}>
              <Package className="w-4 h-4" /> Products
            </button>
            <button onClick={() => setActiveTab('vendors')} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'vendors' ? 'bg-white text-orange-600' : 'text-white'}`}>
              <Store className="w-4 h-4" /> Vendors
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 border border-gray-200 focus-within:border-orange-400 transition-colors">
              <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search products or vendors..." className="flex-1 py-3 bg-transparent focus:outline-none text-sm" />
              {filters.search && <button type="button" onClick={() => setFilters(f => ({ ...f, search: '' }))}><X className="w-4 h-4 text-gray-400" /></button>}
            </div>
            <button type="submit" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors">Search</button>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </form>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">City</label>
                <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Enter city" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              {activeTab === 'products' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                    <select value={filters.category_id} onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Min Price (₦)</label>
                    <input type="number" value={filters.min_price} onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))} placeholder="0" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Max Price (₦)</label>
                    <input type="number" value={filters.max_price} onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))} placeholder="Any" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                </>
              )}
              <div className="flex items-end">
                <button onClick={() => setFilters({ search: '', category_id: '', city: location.city, min_price: '', max_price: '', sponsored: false })} className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                  <X className="w-4 h-4" /> Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{pagination.total} {activeTab === 'products' ? 'products' : 'vendors'} found</p>
        </div>

        {loading ? (
          <div className={`grid gap-6 ${activeTab === 'products' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {[...Array(12)].map((_, i) => <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : activeTab === 'products' ? (
          products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-400">Try changing your search or location</p>
            </div>
          )
        ) : (
          vendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map(v => <VendorCard key={v.id} vendor={v} />)}
            </div>
          ) : (
            <div className="text-center py-20">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No vendors found</h3>
              <p className="text-gray-400">Try changing your city or search</p>
            </div>
          )
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
            <button onClick={() => fetchData(pagination.page - 1)} disabled={pagination.page === 1} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
              const page = i + 1;
              return (
                <button key={page} onClick={() => fetchData(page)} className={`w-10 h-10 rounded-xl font-medium text-sm ${pagination.page === page ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>{page}</button>
              );
            })}
            <button onClick={() => fetchData(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function MarketplacePage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}><MarketplaceContent /></Suspense>;
}
