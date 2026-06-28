'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppContext';
import {
  Eye, EyeOff, Mail, Lock, User, MapPin, Phone, ArrowRight,
  CheckCircle, ExternalLink, Store, Bike
} from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import toast from 'react-hot-toast';

// Portal URLs — override via env vars at build time
const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? 'https://lastmart-vendor.onrender.com';
const RIDER_URL  = process.env.NEXT_PUBLIC_RIDER_URL  ?? 'https://lastmart-rider.onrender.com';

function RegisterContent() {
  const { login } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', city: 'Lagos', address: '',
    referral_code: refCode,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const cities = [
    'Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan',
    'Enugu', 'Kaduna', 'Benin City', 'Warri', 'Aba',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (!termsAccepted) { toast.error('Please accept the Terms & Conditions to continue'); return; }
    if (!ageConfirmed) { toast.error('Please confirm you are 18 years or older'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'customer' }),
      });
      const data = await res.json();
      if (data.success) {
        await login(form.email, form.password);

        // Record terms acceptance
        const token = localStorage.getItem('auth_token');
        if (token) {
          fetch('/api/verification/terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ version: '1.0' }),
          }).catch(() => {});
        }

        toast.success('Account created successfully!');
        router.push('/');
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-pink-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <BrandLogo className="justify-center" />
          </div>
          <p className="text-gray-400 mt-2">Create your customer account</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-300 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-300 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+234..."
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm appearance-none"
                  >
                    {cities.map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 6 chars"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-orange-400 text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password" required value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat password"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <label className="text-xs font-medium text-gray-300 mb-1 block">
                Referral Code <span className="text-gray-500">(optional)</span>
              </label>
              <input
                value={form.referral_code}
                onChange={e => setForm(f => ({ ...f, referral_code: e.target.value }))}
                placeholder="e.g. REF-ABC123"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 text-sm"
              />
              {refCode && <p className="text-xs text-green-400 mt-1">✓ Referral code applied – you&apos;ll get 0.5% off your first order!</p>}
            </div>

            {/* Terms & Conditions */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                    termsAccepted ? 'bg-orange-500 border-orange-500' : 'border-white/30 hover:border-orange-400'
                  }`}
                >
                  {termsAccepted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs text-gray-300 leading-relaxed">
                  I have read and agree to LastMart&apos;s{' '}
                  <Link href="/terms" target="_blank" className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1">
                    Terms & Conditions <ExternalLink className="w-3 h-3" />
                  </Link>{' '}
                  including the marketplace rules, prohibited items policy, and account suspension policy.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => setAgeConfirmed(!ageConfirmed)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                    ageConfirmed ? 'bg-orange-500 border-orange-500' : 'border-white/30 hover:border-orange-400'
                  }`}
                >
                  {ageConfirmed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs text-gray-300 leading-relaxed">
                  I confirm I am 18 years or older and the information I provide is accurate.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !termsAccepted || !ageConfirmed}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>Create Customer Account</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-orange-400 font-semibold hover:text-orange-300">Sign In</Link>
          </p>
        </div>

        {/* Sell / Deliver — separate portals */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 text-center">
            Want to sell or deliver? Register on the right portal
          </p>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`${VENDOR_URL}/auth/register`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl px-4 py-3 transition-colors group"
            >
              <Store className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-300">Become a Vendor</p>
                <p className="text-xs text-green-500/80 truncate">Register &amp; sell products</p>
              </div>
              <ExternalLink className="w-3 h-3 text-green-500 group-hover:text-green-300 ml-auto flex-shrink-0" />
            </a>
            <a
              href={`${RIDER_URL}/auth/register`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl px-4 py-3 transition-colors group"
            >
              <Bike className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-300">Become a Rider</p>
                <p className="text-xs text-blue-500/80 truncate">Register &amp; earn</p>
              </div>
              <ExternalLink className="w-3 h-3 text-blue-500 group-hover:text-blue-300 ml-auto flex-shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterClient() {
  return <Suspense fallback={<div />}><RegisterContent /></Suspense>;
}
