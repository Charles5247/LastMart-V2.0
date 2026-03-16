import Link from 'next/link';
import { Store, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const LINKS = {
  shop: [
    ['All Products', '/marketplace'],
    ['All Vendors', '/marketplace?view=vendors'],
    ['Electronics', '/marketplace?category=Electronics'],
    ['Fashion', '/marketplace?category=Fashion'],
    ['Food & Groceries', '/marketplace?category=Food+%26+Groceries'],
  ],
  account: [
    ['Sign In', '/auth/login'],
    ['Create Account', '/auth/register'],
    ['My Orders', '/dashboard/customer/orders'],
    ['Saved Vendors', '/dashboard/customer/saved'],
    ['Sell on LastMart', '/auth/register?role=vendor'],
  ],
  support: [
    ['Help Center', '#'],
    ['Track My Order', '#'],
    ['Returns Policy', '#'],
    ['Payment Options', '#'],
    ['Contact Support', '#'],
  ],
  legal: [
    ['Terms of Service', '#'],
    ['Privacy Policy', '#'],
    ['Cookie Policy', '#'],
    ['Seller Agreement', '#'],
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Get the best deals delivered</h3>
              <p className="text-sm text-gray-400">Subscribe for exclusive offers, new vendor alerts, and local deals.</p>
            </div>
            <form onSubmit={e => e.preventDefault()} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 md:w-72 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                Subscribe <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white">LastMart</span>
            </Link>
            <p className="text-sm leading-relaxed mb-5 max-w-xs">
              Nigeria&apos;s fastest local marketplace. Connect with verified vendors in your city and receive your orders within 48 hours.
            </p>
            <div className="flex gap-2">
              {[
                { Icon: Facebook, href: '#' },
                { Icon: Twitter, href: '#' },
                { Icon: Instagram, href: '#' },
                { Icon: Youtube, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} className="w-9 h-9 bg-gray-800 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-all hover:-translate-y-0.5">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2.5">
              {LINKS.shop.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm hover:text-orange-400 transition-colors hover:translate-x-0.5 inline-block">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">My Account</h4>
            <ul className="space-y-2.5">
              {LINKS.account.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm hover:text-orange-400 transition-colors hover:translate-x-0.5 inline-block">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5">
              {LINKS.support.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm hover:text-orange-400 transition-colors hover:translate-x-0.5 inline-block">{label}</Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2.5">
              <a href="mailto:hello@lastmart.ng" className="flex items-center gap-2 text-sm hover:text-orange-400 transition-colors">
                <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" /> hello@lastmart.ng
              </a>
              <a href="tel:+2348001234567" className="flex items-center gap-2 text-sm hover:text-orange-400 transition-colors">
                <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" /> +234 800 LASTMART
              </a>
              <span className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" /> Lagos, Nigeria
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} LastMart Technologies Ltd. All rights reserved.</p>
          <div className="flex items-center flex-wrap gap-4">
            {LINKS.legal.map(([label, href]) => (
              <Link key={label} href={href} className="hover:text-orange-400 transition-colors">{label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Delivery within</span>
            <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full font-bold text-xs">48 HRS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
