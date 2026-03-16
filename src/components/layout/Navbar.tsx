'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, Bell, Menu, X, MapPin, Search, ChevronDown, User, Package, Heart, Settings, LogOut, LayoutDashboard, Store } from 'lucide-react';
import { useApp } from '@/components/AppContext';

export default function Navbar() {
  const { user, vendor, cartCount, notifications, unreadNotifications, logout, location, setLocation, refreshNotifications } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityInput, setCityInput] = useState(location.city);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
  };

  const handleCityChange = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(cityInput);
  };

  const dashboardLink = user?.role === 'admin' ? '/dashboard/admin' : user?.role === 'vendor' ? '/dashboard/vendor' : '/dashboard/customer';

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">LastMart</span>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <form onSubmit={handleSearch} className="flex w-full">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-l-xl px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                <MapPin className="w-4 h-4 mr-1 text-orange-500" />
                <form onSubmit={handleCityChange} className="flex">
                  <input value={cityInput} onChange={e => setCityInput(e.target.value)} className="bg-transparent w-16 focus:outline-none text-gray-700 text-xs" placeholder="City" />
                </form>
              </div>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products, vendors..."
                className="flex-1 border-y border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-2 rounded-r-xl hover:opacity-90 transition-opacity">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            <Link href="/marketplace" className="hidden md:flex items-center text-sm text-gray-600 hover:text-orange-500 font-medium transition-colors">
              <Package className="w-4 h-4 mr-1" /> Marketplace
            </Link>

            {user ? (
              <>
                {/* Cart */}
                <Link href="/dashboard/customer" className="relative p-2 text-gray-600 hover:text-orange-500 transition-colors">
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cartCount > 9 ? '9+' : cartCount}</span>
                  )}
                </Link>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                  <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) refreshNotifications(); }} className="relative p-2 text-gray-600 hover:text-orange-500 transition-colors">
                    <Bell className="w-6 h-6" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white flex justify-between items-center">
                        <span className="font-semibold">Notifications</span>
                        {unreadNotifications > 0 && (
                          <button onClick={async () => { await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({ mark_all: true }) }); refreshNotifications(); }} className="text-xs bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-center text-gray-400 py-8 text-sm">No notifications yet</p>
                        ) : notifications.slice(0, 10).map(n => (
                          <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-orange-50' : ''}`}>
                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div ref={userRef} className="relative">
                  <button onClick={() => setUserOpen(!userOpen)} className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors">
                    <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 max-w-24 truncate">{user.name.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-pink-50 border-b border-gray-100">
                        <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                      </div>
                      <Link href={dashboardLink} onClick={() => setUserOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard className="w-4 h-4 mr-3 text-orange-500" /> Dashboard
                      </Link>
                      {user.role === 'customer' && (
                        <>
                          <Link href="/dashboard/customer/orders" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <Package className="w-4 h-4 mr-3 text-blue-500" /> My Orders
                          </Link>
                          <Link href="/dashboard/customer/saved" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                            <Heart className="w-4 h-4 mr-3 text-red-500" /> Saved Vendors
                          </Link>
                        </>
                      )}
                      <Link href="/dashboard/customer/settings" onClick={() => setUserOpen(false)} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                        <Settings className="w-4 h-4 mr-3 text-gray-500" /> Settings
                      </Link>
                      <button onClick={logout} className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors">
                        <LogOut className="w-4 h-4 mr-3" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/login" className="text-sm text-gray-600 hover:text-orange-500 font-medium transition-colors px-3 py-2">Login</Link>
                <Link href="/auth/register" className="bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">Get Started</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2">
            <form onSubmit={handleSearch} className="flex mt-3 mb-4">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="flex-1 border border-gray-200 rounded-l-xl px-4 py-2 text-sm focus:outline-none" />
              <button type="submit" className="bg-orange-500 text-white px-4 rounded-r-xl"><Search className="w-4 h-4" /></button>
            </form>
            <Link href="/marketplace" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>Marketplace</Link>
            {user ? (
              <>
                <Link href={dashboardLink} className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <button onClick={logout} className="block py-2 text-red-600 font-medium">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link href="/auth/register" className="block py-2 text-orange-600 font-medium" onClick={() => setMobileOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
