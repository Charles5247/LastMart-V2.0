import Link from 'next/link';
import { Store, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black text-white">LastMart</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Nigeria's fastest local marketplace. Shop from vendors near you and get delivery within 48 hours.
            </p>
            <div className="flex space-x-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[['Marketplace', '/marketplace'], ['Become a Vendor', '/auth/register?role=vendor'], ['About Us', '#'], ['Blog', '#'], ['Careers', '#']].map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:text-orange-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              {[['Help Center', '#'], ['Track Order', '#'], ['Returns Policy', '#'], ['Payment Options', '#'], ['Terms & Privacy', '#']].map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:text-orange-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2"><MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" /><span>Lagos, Nigeria</span></li>
              <li className="flex items-center space-x-2"><Phone className="w-4 h-4 text-orange-400 flex-shrink-0" /><span>+234 800 LASTMART</span></li>
              <li className="flex items-center space-x-2"><Mail className="w-4 h-4 text-orange-400 flex-shrink-0" /><span>hello@lastmart.ng</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© 2024 LastMart. All rights reserved.</p>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <span className="text-gray-500">Delivery within</span>
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">48 HOURS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
