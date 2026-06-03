'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (data.success) {
        toast.success('If that email exists, a reset link was sent.');
      } else {
        toast.error(data.error || 'Unable to process request');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-pink-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Forgot Password</h1>
          <p className="text-gray-400 mt-2">Enter your email to receive reset instructions</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-4 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send reset link'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Remembered? <Link href="/auth/login" className="text-orange-400 font-semibold hover:text-orange-300">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
