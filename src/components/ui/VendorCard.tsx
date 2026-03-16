'use client';
import Link from 'next/link';
import { Star, MapPin, Heart, ArrowRight, CheckCircle } from 'lucide-react';
import { Vendor } from '@/types';
import { useApp } from '@/components/AppContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface VendorCardProps {
  vendor: Vendor;
  showSave?: boolean;
}

export default function VendorCard({ vendor, showSave = true }: VendorCardProps) {
  const { user, token } = useApp();
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user || !token) { window.location.href = '/auth/login'; return; }
    try {
      if (isSaved) {
        await fetch(`/api/users/saved-vendors?vendor_id=${vendor.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setIsSaved(false);
        toast.success('Vendor removed from saved');
      } else {
        const res = await fetch('/api/users/saved-vendors', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ vendor_id: vendor.id }) });
        const data = await res.json();
        if (data.success) { setIsSaved(true); toast.success('Vendor saved!'); }
        else toast.error(data.error);
      }
    } catch { toast.error('Network error'); }
  };

  const categoryColors: Record<string, string> = {
    'Electronics': 'bg-blue-100 text-blue-700',
    'Fashion': 'bg-pink-100 text-pink-700',
    'Food & Groceries': 'bg-green-100 text-green-700',
    'Health & Beauty': 'bg-purple-100 text-purple-700',
    'Sports & Fitness': 'bg-orange-100 text-orange-700',
    'Home & Living': 'bg-yellow-100 text-yellow-700',
    'Books & Stationery': 'bg-indigo-100 text-indigo-700',
    'Toys & Games': 'bg-red-100 text-red-700',
  };

  const catColor = (vendor.category && categoryColors[vendor.category]) || 'bg-gray-100 text-gray-700';

  return (
    <Link href={`/vendor/${vendor.id}`} className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1">
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 overflow-hidden">
        {vendor.banner ? (
          <img src={vendor.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }} />
          </div>
        )}
        {vendor.is_featured === 1 && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            ⭐ Featured
          </div>
        )}
        {showSave && (
          <button onClick={handleSave} className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-colors">
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        )}
        {/* Avatar */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl border-2 border-white overflow-hidden">
            {vendor.logo ? <img src={vendor.logo} alt={vendor.store_name} className="w-full h-full object-cover" /> : (
              <span>{vendor.store_name.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 px-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm group-hover:text-orange-500 transition-colors truncate">{vendor.store_name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{vendor.city}</span>
              {vendor.distance !== undefined && vendor.distance !== null && (
                <span className="text-xs text-orange-500 font-medium">· {vendor.distance.toFixed(1)}km</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{vendor.rating || 0}</span>
            <span className="text-xs text-gray-400">({vendor.total_reviews || 0})</span>
          </div>
        </div>

        {vendor.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{vendor.description}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          {vendor.category && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${catColor}`}>{vendor.category}</span>
          )}
          <span className="text-xs text-orange-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            Visit Store <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
