'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bike, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { setStoredToken, setStoredUser, decodeToken, isRiderAuthenticated } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL ?? 'https://lastmart.onrender.com';

export default function RiderLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (isRiderAuthenticated()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message ?? 'Invalid credentials');
        return;
      }

      const token = data.data?.token;
      if (!token) { setError('Authentication failed. Please try again.'); return; }

      const user = decodeToken(token);
      if (!user || user.role !== 'rider') {
        setError('This portal is for delivery riders only. Please use the correct login page.');
        return;
      }

      setStoredToken(token);
      setStoredUser(user);
      toast.success(`Welcome back, ${user.name}!`);
      router.replace('/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 shadow-lg">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Rider Portal</h1>
          <p className="text-gray-500 mt-1">Sign in to manage your deliveries</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
                placeholder="rider@example.com" autoComplete="email" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
                  placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-green-600 hover:text-green-700 font-semibold">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing In…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New rider?{' '}
            <Link href="/auth/register" className="text-green-600 hover:text-green-700 font-bold">
              Apply to join
            </Link>
          </p>

          <div className="border-t border-gray-100 mt-6 pt-4 text-center">
            <p className="text-xs text-gray-400">
              Not a rider?{' '}
              <a href={CUSTOMER_URL} className="text-green-600 hover:underline font-semibold">
                Shop on LastMart
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
