'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { setStoredToken, setStoredUser, decodeToken } from '@/lib/auth';

export default function VendorRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', city: 'Lagos',
    store_name: '', store_description: '', category: '',
  });

  const cities      = ['Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan', 'Enugu', 'Kaduna', 'Benin City', 'Warri', 'Aba'];
  const categories  = ['Electronics', 'Fashion', 'Food & Groceries', 'Home & Living', 'Health & Beauty', 'Sports & Fitness', 'Books & Stationery', 'Toys & Games'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.store_name) { setError('Store name is required'); return; }

    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, role: 'vendor' }),
      });
      const data = await res.json();

      if (!data.success) { setError(data.error || 'Registration failed'); setLoading(false); return; }

      const user = decodeToken(data.data.token);
      if (!user || user.role !== 'vendor') { setError('Registration error. Please try again.'); setLoading(false); return; }

      setStoredToken(data.data.token);
      setStoredUser(user);
      toast.success('Store created! Welcome to LastMart Vendor 🎉');
      router.replace('/dashboard');
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-orange-950 to-gray-900 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-orange-500 to-pink-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Create Your Vendor Store</h1>
          <p className="text-gray-400 mt-1">Start selling on LastMart today — it's free</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="John Doe" className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+234 800 000 0000" className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@business.com" className="input" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleChange} required placeholder="Min. 6 characters" className="input pr-11" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required placeholder="Repeat password" className="input" />
              </div>
            </div>

            {/* Store Info */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-orange-600 mb-3 flex items-center gap-2"><Store className="w-4 h-4" /> Store Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Name</label>
                  <input name="store_name" type="text" value={form.store_name} onChange={handleChange} required placeholder="My Awesome Store" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select name="category" value={form.category} onChange={handleChange} className="input">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
                  <select name="city" value={form.city} onChange={handleChange} className="input">
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Description</label>
                <textarea name="store_description" value={form.store_description} onChange={handleChange as any} rows={2} placeholder="Tell customers what you sell…" className="input resize-none" />
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-orange-50 rounded-xl p-4 space-y-1.5">
              {['Zero listing fees to get started','Reach customers across all Nigerian cities','Real-time order notifications','Built-in analytics and payout tracking'].map(b => (
                <div key={b} className="flex items-center gap-2 text-sm text-orange-800">
                  <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" /> {b}
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Creating Store…' : 'Create My Store'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have a vendor account?{' '}
              <Link href="/auth/login" className="text-orange-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
