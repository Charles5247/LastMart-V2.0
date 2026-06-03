'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ResetClient() {
  const search = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(search.get('token') || '');
    setEmail(search.get('email') || '');
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, email, password }) });
      const data = await res.json();
      if (data.success) {
        toast.success('Password updated. Please sign in.');
        router.push('/auth/login');
      } else {
        toast.error(data.error || 'Unable to reset password');
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
          <h1 className="text-3xl font-black text-white">Reset Password</h1>
          <p className="text-gray-400 mt-2">Create a new password for your account</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">New Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-4 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Confirm Password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl pl-4 pr-4 py-3 focus:outline-none focus:border-orange-400 text-sm" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
