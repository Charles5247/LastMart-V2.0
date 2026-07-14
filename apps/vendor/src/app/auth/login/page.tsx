'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { setStoredToken, setStoredUser, decodeToken, isVendorAuthenticated } from '@/lib/auth';

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  /* Redirect already-authenticated vendors */
  useEffect(() => {
    if (isVendorAuthenticated()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      const user = decodeToken(data.data.token);
      if (!user || user.role !== 'vendor') {
        setError('This portal is for vendors only. Please use the correct login page.');
        setLoading(false);
        return;
      }

      setStoredToken(data.data.token);
      setStoredUser(user);
      toast.success(`Welcome back, ${user.name}!`);
      router.replace('/dashboard');
    } catch {
      setError('Network error. Please check your connection.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-orange-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-orange-500 to-pink-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">LastMart Vendor</h1>
          <p className="text-gray-400 mt-1">Sign in to manage your store</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Vendor Login</h2>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@yourbusiness.com"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? 'Signing in…' : 'Sign In to Vendor Portal'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Don't have a vendor account?{' '}
              <Link href="/auth/register" className="text-orange-600 font-semibold hover:underline">Register here</Link>
            </p>
            <p className="text-sm text-gray-500">
              Looking for the{' '}
              <a href={process.env.NEXT_PUBLIC_CUSTOMER_URL || 'https://lastmart.onrender.com'} className="text-blue-600 hover:underline">
                Customer Store
              </a>
              ?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
