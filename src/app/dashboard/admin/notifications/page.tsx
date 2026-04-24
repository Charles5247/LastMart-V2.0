'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useApp } from '@/components/AppContext';
import { Bell, Send, Users, Store, User, Globe, ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminNotificationsPage() {
  const { user, token, isLoading } = useApp();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    target_role: 'all',
    target_user_id: '',
    title: '',
    message: '',
    type: 'admin_broadcast',
  });

  useEffect(() => {
    if (!isLoading && !user) { router.push('/auth/login'); return; }
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return; }
  }, [user, isLoading]);

  const handleSend = async () => {
    if (!form.title || !form.message) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        toast.success(data.message);
        setForm({ target_role: 'all', target_user_id: '', title: '', message: '', type: 'admin_broadcast' });
      } else {
        toast.error(data.error);
      }
    } catch { toast.error('Network error'); }
    setSending(false);
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50"><Navbar /></div>;

  const templates = [
    { label: '📢 Platform Update', title: 'LastMart Platform Update', message: 'We have made improvements to the LastMart platform. Please refresh your app for the best experience.' },
    { label: '🎁 Promo Alert', title: '🎁 Special Promotion!', message: 'A new promotion is live on LastMart! Check out the marketplace for amazing deals from your favorite vendors.' },
    { label: '⚠️ Policy Reminder', title: '⚠️ Marketplace Policy Reminder', message: 'A reminder to all users: please review our Terms & Conditions at lastmart.ng/terms to ensure your account remains in good standing.' },
    { label: '🛒 Shopping Reminder', title: 'Haven\'t shopped in a while?', message: 'We miss you! New products and vendors are available in your city. Come check out what\'s new on LastMart.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-pink-500" />
            <h1 className="text-2xl font-black text-gray-900">Send Notifications</h1>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 font-medium">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Target */}
          <div className="mb-5">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: 'all', label: 'Everyone', icon: Globe },
                { value: 'customer', label: 'Customers', icon: User },
                { value: 'vendor', label: 'Vendors', icon: Store },
                { value: 'specific', label: 'Specific User', icon: Users },
              ].map(t => (
                <button key={t.value} onClick={() => setForm(f => ({ ...f, target_role: t.value }))}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${form.target_role === t.value ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                  <t.icon className="w-5 h-5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.target_role === 'specific' && (
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-1 block">User ID</label>
              <input value={form.target_user_id} onChange={e => setForm(f => ({ ...f, target_user_id: e.target.value }))}
                placeholder="Paste user UUID..." className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          )}

          {/* Templates */}
          <div className="mb-5">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Quick Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(t => (
                <button key={t.label} onClick={() => setForm(f => ({ ...f, title: t.title, message: t.message }))}
                  className="text-left px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-600 hover:bg-orange-50 hover:border-orange-300 transition-all">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notification Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., 🎁 New offer available!" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400" />
          </div>

          {/* Message */}
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Message *</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Write your notification message here..." rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
          </div>

          <button onClick={handleSend} disabled={sending}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {sending ? <Loader className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Send Notification</>}
          </button>
        </div>
      </div>
    </div>
  );
}
