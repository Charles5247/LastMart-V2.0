'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/ui/ProductCard';
import VendorCard from '@/components/ui/VendorCard';
import {
  Search, Filter, X, Store, Package, MapPin, ChevronLeft, ChevronRight,
  SlidersHorizontal, ChevronDown, LayoutGrid, List, Tag
} from 'lucide-react';
import { useApp } from '@/components/AppContext';

function MarketplaceContent() {
  const { location } = useApp();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get('view') === 'vendors' ? 'vendors' : 'products'
  );
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    city: location.city,
    min_price: '',
    max_price: '',
    sponsored: false,
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => { setFilters(f => ({ ...f, city: location.city })); }, [location.city]);
  useEffect(() => { fetchData(1); }, [filters, activeTab]);
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
  }, []);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const params = new URLSearchParams({
          page: String(page), limit: '20',
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
          page: String(page), limit: '18',
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

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchData(1); };
  const clearFilter = (key: string) => setFilters(f => ({ ...f, [key]: '' }));

  const activeCategory = categories.find(c => c.id === filters.category_id);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* ── Page header bar ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <a href="/" className="hover:text-orange-500">Home</a>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-gray-800">Marketplace</span>
            {activeCategory && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="font-medium text-gray-800">{activeCategory.name}</span>
              </>
            )}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 focus-within:border-orange-400 focus-within:bg-white transition-colors">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder={`Search ${activeTab === 'products' ? 'products' : 'vendors'}...`}
                className="flex-1 px-3 py-2.5 bg-transparent focus:outline-none text-sm text-gray-800 placeholder-gray-400"
              />
              {filters.search && (
                <button type="button" onClick={() => clearFilter('search')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary px-6 text-sm">
              Search
            </button>
          </form>

          {/* Tabs */}
          <div className="flex items-center gap-0 mt-3 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'products' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Package className="w-4 h-4" /> Products
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'vendors' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Store className="w-4 h-4" /> Vendors
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex gap-5">

          {/* ── LEFT SIDEBAR ── */}
          <aside className={`hidden lg:block flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
            <div className="panel sticky top-28">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-orange-500" /> Filters
                </span>
                <button
                  onClick={() => setFilters({ search: filters.search, category_id: '', city: location.city, min_price: '', max_price: '', sponsored: false })}
                  className="text-xs text-orange-500 hover:underline font-medium"
                >
                  Clear all
                </button>
              </div>

              {/* City */}
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Delivery City</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <input
                    value={filters.city}
                    onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                    className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700"
                    placeholder="Your city"
                  />
                </div>
              </div>

              {/* Categories */}
              {activeTab === 'products' && (
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Category</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => setFilters(f => ({ ...f, category_id: '' }))}
                      className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${!filters.category_id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      All Categories
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setFilters(f => ({ ...f, category_id: cat.id }))}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${filters.category_id === cat.id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price range */}
              {activeTab === 'products' && (
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Price Range (₦)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.min_price}
                      onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))}
                      placeholder="Min"
                      className="input text-sm py-2 px-2"
                    />
                    <span className="text-gray-400 text-sm">–</span>
                    <input
                      type="number"
                      value={filters.max_price}
                      onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))}
                      placeholder="Max"
                      className="input text-sm py-2 px-2"
                    />
                  </div>
                </div>
              )}

              {/* Sponsored toggle */}
              {activeTab === 'products' && (
                <div className="p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setFilters(f => ({ ...f, sponsored: !f.sponsored }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${filters.sponsored ? 'bg-orange-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.sponsored ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm text-gray-700">Sponsored only</span>
                  </label>
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Results bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden lg:flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-500 transition-colors border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                >
                  <Filter className="w-4 h-4" />
                  {sidebarOpen ? 'Hide' : 'Show'} Filters
                </button>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{pagination.total}</span> {activeTab} found
                  {filters.city && <> in <span className="font-medium text-orange-500">{filters.city}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-orange-400 text-gray-700"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Best Rated</option>
                </select>
              </div>
            </div>

            {/* Active filters chips */}
            {(filters.category_id || filters.min_price || filters.max_price) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeCategory && (
                  <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full border border-orange-200">
                    <Tag className="w-3 h-3" /> {activeCategory.name}
                    <button onClick={() => clearFilter('category_id')} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.min_price && (
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                    Min ₦{filters.min_price}
                    <button onClick={() => clearFilter('min_price')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.max_price && (
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                    Max ₦{filters.max_price}
                    <button onClick={() => clearFilter('max_price')}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Product/Vendor grid */}
            {loading ? (
              <div className={`grid gap-3 ${activeTab === 'products' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {[...Array(activeTab === 'products' ? 20 : 12)].map((_, i) => (
                  <div key={i} className="panel">
                    <div className="skeleton aspect-square" />
                    <div className="p-3 space-y-2">
                      <div className="skeleton h-3 w-3/4 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                      <div className="skeleton h-4 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'products' ? (
              products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : (
                <div className="panel py-20 text-center">
                  <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-gray-600 mb-1">No products found</h3>
                  <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                  <button
                    onClick={() => setFilters({ search: '', category_id: '', city: location.city, min_price: '', max_price: '', sponsored: false })}
                    className="mt-4 btn-outline text-sm px-5 py-2"
                  >
                    Clear Filters
                  </button>
                </div>
              )
            ) : (
              vendors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map(v => <VendorCard key={v.id} vendor={v} />)}
                </div>
              ) : (
                <div className="panel py-20 text-center">
                  <Store className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-gray-600 mb-1">No vendors found</h3>
                  <p className="text-sm text-gray-400">Try a different city or search term</p>
                </div>
              )
            )}

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-8">
                <button
                  onClick={() => fetchData(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => fetchData(page)}
                      className={`w-9 h-9 rounded-lg font-medium text-sm transition-colors ${pagination.page === page ? 'bg-orange-500 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchData(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading marketplace...</p>
        </div>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
