'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Store, Bike, Shield, ExternalLink } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import toast from 'react-hot-toast';

// Portal URLs — override via env if needed
const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? 'https://lastmart-vendor.onrender.com';
const RIDER_URL  = process.env.NEXT_PUBLIC_RIDER_URL  ?? 'https://lastmart-rider.onrender.com';
const ADMIN_URL  = process.env.NEXT_PUBLIC_ADMIN_URL  ?? 'https://lastmart-admin.onrender.com';

function LoginContent() {
  const { login } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } else {
      toast.error(result.error || 'Login failed');
    }
    setLoading(false);
  };

  // Customer-only quick demo
  const fillDemo = () => setForm({ email: 'bola@example.com', password: 'customer123' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-pink-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <BrandLogo className="justify-center" />
          </div>
          <p className="text-gray-400 mt-2">Welcome back! Sign in to continue</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Customer Sign In</h2>

          {/* Demo account — customer only */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2 font-medium">Quick Demo (Customer):</p>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full bg-blue-600/80 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors text-left flex items-center gap-2"
            >
              🛍️ <span>Fill demo customer account</span>
              <span className="ml-auto text-gray-300 font-normal">bola@example.com</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Your password"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-11 pr-11 py-3 focus:outline-none focus:border-orange-400 text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div />
              <Link href="/auth/forgot" className="text-sm text-orange-300 hover:text-orange-200">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don&apos;t have an account? <Link href="/auth/register" className="text-orange-400 font-semibold hover:text-orange-300">Create Account</Link>
          </p>
        </div>

        {/* Other portals — clearly separated */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 text-center">
            Not a customer? Sign in to your portal
          </p>
          <div className="grid grid-cols-3 gap-3">
            <a
              href={`${VENDOR_URL}/auth/login`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl p-3 transition-colors group"
            >
              <Store className="w-5 h-5 text-green-400" />
              <span className="text-xs font-semibold text-green-300">Vendor</span>
              <ExternalLink className="w-3 h-3 text-green-500 group-hover:text-green-300 transition-colors" />
            </a>
            <a
              href={`${RIDER_URL}/auth/login`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl p-3 transition-colors group"
            >
              <Bike className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-semibold text-blue-300">Rider</span>
              <ExternalLink className="w-3 h-3 text-blue-500 group-hover:text-blue-300 transition-colors" />
            </a>
            <a
              href={`${ADMIN_URL}/auth/login`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl p-3 transition-colors group"
            >
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">Admin</span>
              <ExternalLink className="w-3 h-3 text-purple-500 group-hover:text-purple-300 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return <Suspense fallback={<div />}><LoginContent /></Suspense>;
}
