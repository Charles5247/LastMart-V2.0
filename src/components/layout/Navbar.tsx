'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart, Bell, Menu, X, MapPin, Search, ChevronDown,
  User, Package, Heart, Settings, LogOut, LayoutDashboard,
  Store, Grid3x3, ChevronRight, Truck, Shield, Headphones
} from 'lucide-react';
import { useApp } from '@/components/AppContext';
import LocationPicker from '@/components/ui/LocationPicker';

const NAV_CATEGORIES = [
  { label: 'Electronics', icon: '📱' },
  { label: 'Fashion', icon: '👗' },
  { label: 'Food & Groceries', icon: '🛒' },
  { label: 'Health & Beauty', icon: '💄' },
  { label: 'Home & Living', icon: '🏠' },
  { label: 'Sports & Fitness', icon: '⚽' },
  { label: 'Books & Stationery', icon: '📚' },
  { label: 'Toys & Games', icon: '🎮' },
];

export default function Navbar() {
  const { user, vendor, cartCount, notifications, unreadNotifications, logout, location, setLocation, refreshNotifications } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityInput, setCityInput] = useState(location.city);
  const [cityOpen, setCityOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCityInput(location.city); }, [location.city]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
  };

  const handleCitySet = () => {
    setLocation(cityInput);
    setCityOpen(false);
  };

  const dashboardLink = user?.role === 'admin'
    ? '/dashboard/admin'
    : user?.role === 'vendor'
      ? '/dashboard/vendor'
      : '/dashboard/customer';

  return (
    <header className="sticky top-0 z-50">
      {/* ── Top announcement bar ── */}
      <div className="bg-gray-900 text-gray-300 text-xs py-1.5 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-orange-400" /> Free delivery on orders over ₦5,000</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-400" /> Buyer protection on all orders</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/register?role=vendor" className="hover:text-orange-400 transition-colors">Sell on LastMart</Link>
            <span className="text-gray-600">|</span>
            <a href="#" className="flex items-center gap-1 hover:text-orange-400 transition-colors"><Headphones className="w-3 h-3" /> Help</a>
          </div>
        </div>
      </div>

      {/* ── Main nav bar ── */}
      <div className="bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-[60px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">LastMart</span>
            </Link>

            {/* Location picker with GPS support */}
            <div className="hidden lg:block flex-shrink-0">
              <LocationPicker compact />
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 flex max-w-2xl">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for products, vendors, categories..."
                className="flex-1 px-4 py-2.5 text-sm text-gray-800 focus:outline-none rounded-l-md bg-white placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-yellow-400 hover:bg-yellow-300 px-5 py-2.5 rounded-r-md transition-colors flex items-center gap-1.5"
              >
                <Search className="w-4 h-4 text-gray-800" />
                <span className="hidden sm:block text-sm font-semibold text-gray-800">Search</span>
              </button>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              {user ? (
                <>
                  {/* Cart */}
                  <Link href="/dashboard/customer" className="relative flex flex-col items-center text-white hover:bg-orange-600/50 px-3 py-1.5 rounded-md transition-colors group">
                    <div className="relative">
                      <ShoppingCart className="w-6 h-6" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-black notif-badge">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs mt-0.5 hidden sm:block">Cart</span>
                  </Link>

                  {/* Notifications */}
                  <div ref={notifRef} className="relative">
                    <button
                      onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) refreshNotifications(); }}
                      className="relative flex flex-col items-center text-white hover:bg-orange-600/50 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <div className="relative">
                        <Bell className="w-6 h-6" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black notif-badge">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </div>
                      <span className="text-xs mt-0.5 hidden sm:block">Alerts</span>
                    </button>

                    {notifOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                        <div className="px-4 py-3 bg-orange-500 text-white flex justify-between items-center">
                          <span className="font-semibold text-sm">Notifications</span>
                          {unreadNotifications > 0 && (
                            <button
                              onClick={async () => {
                                await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({ mark_all: true }) });
                                refreshNotifications();
                              }}
                              className="text-xs bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <p className="text-center text-gray-400 py-8 text-sm">No notifications yet</p>
                          ) : notifications.slice(0, 10).map(n => (
                            <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-orange-50 border-l-2 border-orange-400' : ''}`}>
                              <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User menu */}
                  <div ref={userRef} className="relative">
                    <button
                      onClick={() => setUserOpen(!userOpen)}
                      className="flex flex-col items-center text-white hover:bg-orange-600/50 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs mt-0.5 hidden sm:block max-w-[72px] truncate">{user.name.split(' ')[0]}</span>
                    </button>
                    {userOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          <span className="inline-block mt-1.5 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full capitalize font-medium">{user.role}</span>
                        </div>
                        <nav className="py-1">
                          <Link href={dashboardLink} onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <LayoutDashboard className="w-4 h-4 mr-3 text-orange-500" /> Dashboard
                          </Link>
                          {user.role === 'customer' && (<>
                            <Link href="/dashboard/customer/orders" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Package className="w-4 h-4 mr-3 text-blue-500" /> My Orders
                            </Link>
                            <Link href="/dashboard/customer/saved" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Heart className="w-4 h-4 mr-3 text-red-500" /> Saved Vendors
                            </Link>
                            <Link href="/budget" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <span className="w-4 h-4 mr-3 text-green-500 font-bold text-xs flex items-center justify-center">₦</span> Budget Planner
                            </Link>
                            <Link href="/delivery" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Truck className="w-4 h-4 mr-3 text-orange-500" /> Delivery Addresses
                            </Link>
                          </>)}
                          <Link href="/lama" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <span className="w-4 h-4 mr-3 text-purple-500 font-bold text-xs flex items-center justify-center">🤖</span> LAMA AI
                          </Link>
                          <Link href="/dashboard/customer/settings" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <Settings className="w-4 h-4 mr-3 text-gray-400" /> Settings
                          </Link>
                          <div className="divider mx-2 my-1" />
                          <button onClick={logout} className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4 mr-3" /> Sign Out
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="flex flex-col items-center text-white hover:bg-orange-600/50 px-3 py-1.5 rounded-md transition-colors">
                    <User className="w-5 h-5" />
                    <span className="text-xs mt-0.5">Sign In</span>
                  </Link>
                  <Link href="/auth/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-sm px-4 py-2 rounded-md transition-colors whitespace-nowrap">
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white hover:bg-orange-600/50 p-2 rounded-md ml-1">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Secondary nav — category bar ── */}
      <div className="bg-gray-900 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 hover:bg-white/10 transition-colors whitespace-nowrap border-r border-white/10 flex-shrink-0"
            >
              <Grid3x3 className="w-4 h-4" /> All Categories
            </Link>
            {NAV_CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={`/marketplace?category=${encodeURIComponent(cat.label)}`}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm px-4 py-2.5 hover:bg-white/10 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <span className="text-base leading-none">{cat.icon}</span>
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl animate-slide-down">
          <div className="p-4 border-b border-gray-100">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products or vendors..."
                className="input flex-1 text-sm"
              />
              <button type="submit" className="bg-orange-500 text-white px-4 rounded-md"><Search className="w-4 h-4" /></button>
            </form>
          </div>
          <div className="p-4 space-y-1">
            {/* City */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <MapPin className="w-4 h-4 text-orange-500" />
              <input value={cityInput} onChange={e => setCityInput(e.target.value)} onBlur={() => setLocation(cityInput)} className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700" />
            </div>
            <Link href="/marketplace" className="flex items-center justify-between px-3 py-3 text-gray-800 font-semibold hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>
              <span className="flex items-center gap-2"><Grid3x3 className="w-4 h-4 text-orange-500" /> All Categories</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            {NAV_CATEGORIES.slice(0, 5).map(cat => (
              <Link key={cat.label} href={`/marketplace?category=${encodeURIComponent(cat.label)}`} className="flex items-center gap-2 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg text-sm" onClick={() => setMobileOpen(false)}>
                <span>{cat.icon}</span> {cat.label}
              </Link>
            ))}
            <div className="divider my-2" />
            {user ? (
              <>
                <Link href={dashboardLink} className="flex items-center gap-2 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="w-4 h-4 text-orange-500" /> Dashboard
                </Link>
                <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium w-full">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/auth/login" className="flex-1 text-center py-2.5 border border-orange-500 text-orange-500 rounded-lg text-sm font-semibold" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link href="/auth/register" className="flex-1 text-center py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold" onClick={() => setMobileOpen(false)}>Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
