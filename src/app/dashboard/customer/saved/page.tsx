'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Heart, MapPin, Star, Trash2, ArrowLeft, ArrowRight, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SavedVendorsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (user) fetchSaved();
  }, [user, isLoading]);

  const fetchSaved = async () => {
    setLoading(true);
    const res = await fetch('/api/users/saved-vendors', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setSaved(data.data);
    setLoading(false);
  };

  const unsave = async (vendorId: string) => {
    await fetch(`/api/users/saved-vendors?vendor_id=${vendorId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSaved(s => s.filter(v => v.vendor_id !== vendorId));
    toast.success('Vendor removed from saved');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/customer" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Saved Vendors</h1>
            <p className="text-gray-500 text-sm">{saved.length} saved vendors</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : saved.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {saved.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-20 bg-gradient-to-br from-orange-400 to-pink-500" />
                <div className="p-5 -mt-8">
                  <div className="flex items-end justify-between mb-3">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl border-2 border-white">
                      {item.logo ? <img src={item.logo} alt={item.store_name} className="w-full h-full object-cover rounded-xl" /> : item.store_name.charAt(0)}
                    </div>
                    <button onClick={() => unsave(item.vendor_id)} className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base">{item.store_name}</h3>
                  <div className="flex items-center gap-3 mt-1 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3 text-orange-500" /> {item.city}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-gray-700 font-medium">{item.rating}</span>
                      <span className="text-gray-400">({item.total_reviews})</span>
                    </div>
                  </div>
                  {item.category && <span className="text-xs bg-orange-50 text-orange-600 font-medium px-2 py-1 rounded-full">{item.category}</span>}
                  <Link href={`/vendor/${item.vendor_id}`} className="mt-4 flex items-center justify-center gap-2 w-full bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium text-sm py-2.5 rounded-xl transition-colors">
                    <Store className="w-4 h-4" /> Visit Store <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No saved vendors</h3>
            <p className="text-gray-400 mb-6">Save your favorite vendors to find them quickly</p>
            <Link href="/marketplace?view=vendors" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium inline-block hover:bg-orange-600">Browse Vendors</Link>
          </div>
        )}
      </div>
    </div>
  );
}
