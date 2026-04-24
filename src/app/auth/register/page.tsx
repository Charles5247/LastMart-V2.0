'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppContext';
import { Store, Eye, EyeOff, Mail, Lock, User, MapPin, Phone, Building, ArrowRight, Shield, CheckCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

function RegisterContent() {
  const { login } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || 'customer';
  
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', city: 'Lagos', address: '',
    store_name: '', store_description: '', category: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const categories = ['Electronics', 'Fashion', 'Food & Groceries', 'Home & Living', 'Health & Beauty', 'Sports & Fitness', 'Books & Stationery', 'Toys & Games'];

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
        body: JSON.stringify({ ...form, role })
      });
      const data = await res.json();
      if (data.success) {
        await login(form.email, form.password);

        // Record terms acceptance
        const token = localStorage.getItem('token');
        if (token) {
          fetch('/api/verification/terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ version: '1.0' })
          }).catch(() => {});
        }

        toast.success('Account created successfully!');
        const redirect = role === 'vendor' ? '/dashboard/vendor' : role === 'admin' ? '/dashboard/admin' : '/';
        router.push(redirect);
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  const cities = ['Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan', 'Enugu', 'Kaduna', 'Benin City', 'Warri', 'Aba'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-pink-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Store className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-black text-white">LastMart</span>
          </Link>
          <p className="text-gray-400 mt-2">Create your account today</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          {/* Role Selection */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-300 mb-2">I want to...</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('customer')} className={`p-3 rounded-xl border text-sm font-medium transition-all ${role === 'customer' ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/20 text-gray-300 hover:border-orange-400'}`}>
                🛍️ Shop (Customer)
              </button>
              <button type="button" onClick={() => setRole('vendor')} className={`p-3 rounded-xl border text-sm font-medium transition-all ${role === 'vendor' ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/20 text-gray-300 hover:border-orange-400'}`}>
                🏪 Sell (Vendor)
              </button>
            </div>
          </div>

          {/* KYC Notice for vendors */}
          {role === 'vendor' && (
            <div className="mb-5 bg-amber-500/20 border border-amber-400/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm">Business Verification Required</p>
                  <p className="text-amber-200/80 text-xs mt-1">After registration, you'll need to complete KYC verification with your CAC certificate, TIN, and valid ID before your store goes live. Products also require vetting before being listed.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-300 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-300 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234..." className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full bg-white/10 border border-white/20 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm appearance-none">
                    {cities.map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 chars" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-orange-400 text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" required value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat password" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
                </div>
              </div>
            </div>

            {/* Vendor-specific fields */}
            {role === 'vendor' && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <p className="text-sm font-semibold text-orange-300">Store Information</p>
                <div>
                  <label className="text-xs font-medium text-gray-300 mb-1 block">Store Name *</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input required value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} placeholder="Your store name" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-300 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 text-sm">
                    <option value="" className="bg-gray-800">Select Category</option>
                    {categories.map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-300 mb-1 block">Store Description</label>
                  <textarea value={form.store_description} onChange={e => setForm(f => ({ ...f, store_description: e.target.value }))} placeholder="Tell customers about your store..." rows={3} className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 text-sm resize-none" />
                </div>
              </div>
            )}

            {/* Terms & Conditions Checkboxes */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                    termsAccepted ? 'bg-orange-500 border-orange-500' : 'border-white/30 hover:border-orange-400'
                  }`}
                >
                  {termsAccepted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs text-gray-300 leading-relaxed">
                  I have read and agree to LastMart's{' '}
                  <Link href="/terms" target="_blank" className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1">
                    Terms & Conditions <ExternalLink className="w-3 h-3" />
                  </Link>{' '}
                  including the marketplace rules, prohibited items policy, and account suspension policy.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setAgeConfirmed(!ageConfirmed)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                    ageConfirmed ? 'bg-orange-500 border-orange-500' : 'border-white/30 hover:border-orange-400'
                  }`}
                >
                  {ageConfirmed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs text-gray-300 leading-relaxed">
                  I confirm I am 18 years or older and the information I provide is accurate. I understand that providing false information may result in account suspension.
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading || !termsAccepted || !ageConfirmed} className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account? <Link href="/auth/login" className="text-orange-400 font-semibold hover:text-orange-300">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div />}><RegisterContent /></Suspense>;
}
