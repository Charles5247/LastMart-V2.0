'use client';
import Link from 'next/link';
import { Star, MapPin, Heart, ArrowRight, Package, CheckCircle } from 'lucide-react';
import { Vendor } from '@/types';
import { useApp } from '@/components/AppContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface VendorCardProps {
  vendor: Vendor;
  showSave?: boolean;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  'Electronics':      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  'Fashion':          { bg: 'bg-pink-50',   text: 'text-pink-700',   dot: 'bg-pink-400' },
  'Food & Groceries': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  'Health & Beauty':  { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  'Sports & Fitness': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  'Home & Living':    { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  'Books & Stationery':{ bg: 'bg-indigo-50',text: 'text-indigo-700', dot: 'bg-indigo-400' },
  'Toys & Games':     { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
};
const DEFAULT_STYLE = { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };

const BANNER_GRADIENTS = [
  'from-orange-400 to-rose-500',
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-fuchsia-600',
  'from-amber-400 to-orange-500',
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

export default function VendorCard({ vendor, showSave = true }: VendorCardProps) {
  const { user, token } = useApp();
  const [isSaved, setIsSaved] = useState(false);

  const catStyle = (vendor.category && CATEGORY_STYLES[vendor.category]) || DEFAULT_STYLE;
  const bannerGrad = BANNER_GRADIENTS[hashStr(vendor.id || vendor.store_name) % BANNER_GRADIENTS.length];

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !token) { window.location.href = '/auth/login'; return; }
    try {
      if (isSaved) {
        await fetch(`/api/users/saved-vendors?vendor_id=${vendor.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        const res = await fetch('/api/users/saved-vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vendor_id: vendor.id }),
        });
        const data = await res.json();
        if (data.success) { setIsSaved(true); toast.success('Vendor saved!'); }
        else toast.error(data.error);
      }
    } catch { toast.error('Network error'); }
  };

  const rating = Number(vendor.rating) || 0;

  return (
    <Link href={`/vendor/${vendor.id}`} className="group card flex flex-col overflow-hidden">
      {/* ── Banner ── */}
      <div className={`relative h-28 bg-gradient-to-br ${bannerGrad} overflow-hidden flex-shrink-0`}>
        {vendor.banner ? (
          <img src={vendor.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          /* Pattern overlay */
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='3' cy='3' r='2'/%3E%3C/g%3E%3C/svg%3E")`
          }} />
        )}

        {/* Featured badge */}
        {vendor.is_featured === 1 && (
          <div className="absolute top-2.5 left-2.5 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            ⭐ Featured
          </div>
        )}

        {/* Save button */}
        {showSave && (
          <button
            onClick={handleSave}
            className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110"
          >
            <Heart className={`w-4 h-4 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        )}

        {/* Logo — overlaps banner/body */}
        <div className="absolute -bottom-5 left-4">
          <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center text-xl border-2 border-white overflow-hidden">
            {vendor.logo
              ? <img src={vendor.logo} alt={vendor.store_name} className="w-full h-full object-cover" />
              : <span className="font-black text-gray-700">{vendor.store_name.charAt(0)}</span>
            }
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pt-7 px-4 pb-4 flex flex-col flex-1">
        {/* Name + rating row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-orange-600 transition-colors">
              {vendor.store_name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{vendor.city}</span>
              {vendor.distance !== undefined && vendor.distance !== null && (
                <span className="text-xs text-orange-500 font-medium flex-shrink-0">· {vendor.distance.toFixed(1)} km</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0 bg-gray-50 px-2 py-1 rounded-lg">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400 ml-0.5">({vendor.total_reviews || 0})</span>
          </div>
        </div>

        {/* Description */}
        {vendor.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{vendor.description}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Package className="w-3 h-3" />
            <span>{vendor.total_sales || 0} sold</span>
          </div>
          {vendor.is_featured === 1 && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>Verified</span>
            </div>
          )}
          <div className="ml-auto">
            {vendor.category && (
              <span className={`tag text-xs ${catStyle.bg} ${catStyle.text}`}>
                {vendor.category}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3">
          <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-orange-500 group-hover:text-orange-700 transition-colors">
            Visit Store <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
