'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import type { ChangeEventHandler, HTMLInputTypeAttribute, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings, Store, LogOut, Package, ShoppingBag, TrendingUp,
  DollarSign, BarChart2, Bell, Save, User, Lock, CreditCard,
  MapPin, Clock, CheckCircle, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { getStoredToken, getStoredUser, clearStoredToken, isVendorAuthenticated } from '@/lib/auth';
import toast from 'react-hot-toast';
import { API_URL } from '../../../../../packages/api/apiFetch';

// const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const NAV = [
  { href: '/dashboard',  icon: BarChart2,   label: 'Dashboard' },
  { href: '/products',   icon: Package,      label: 'Products' },
  { href: '/orders',     icon: ShoppingBag,  label: 'Orders' },
  { href: '/analytics',  icon: TrendingUp,   label: 'Analytics' },
  { href: '/payouts',    icon: DollarSign,   label: 'Payouts' },
  { href: '/settings',   icon: Settings,     label: 'Settings', active: true },
];

const TABS = ['Store', 'Account', 'Bank', 'Notifications'];

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

type InputProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
};

const Input = ({ value, onChange, placeholder, type = 'text' }: InputProps) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
);

export default function VendorSettingsPage() {
  const router = useRouter();
  const [navOpen,  setNavOpen]  = useState(false);
  const [tab,      setTab]      = useState('Store');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  // Store settings
  const [store, setStore] = useState({
    store_name: '', description: '', category: '', city: '', address: '',
    phone: '', opening_hours: '', delivery_radius: '10', min_order: '500',
  });

  // Account settings
  const [account, setAccount] = useState({ name: '', email: '', phone: '' });

  // Password change
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });

  // Bank details
  const [bank, setBank] = useState({ bank_name: '', account_number: '', account_name: '' });

  // Notifications
  const [notifs, setNotifs] = useState({
    new_order: true, order_update: true, payout: true, marketing: false,
  });

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!isVendorAuthenticated()) { router.replace('/auth/login'); return; }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [vendorRes, userRes] = await Promise.all([
        fetch(`${API_URL}/vendors/me`, { headers: hdrs() }),
        fetch(`${API_URL}/users/me`,    { headers: hdrs() }),
      ]);
      const [vendorData, userData] = await Promise.all([vendorRes.json(), userRes.json()]);
      if (vendorData.success && vendorData.data) {
        const v = vendorData.data;
        setStore({
          store_name: v.store_name ?? '', description: v.description ?? '',
          category: v.category ?? '', city: v.city ?? '', address: v.address ?? '',
          phone: v.phone ?? '', opening_hours: v.opening_hours ?? '',
          delivery_radius: String(v.delivery_radius ?? 10),
          min_order: String(v.min_order ?? 500),
        });
        setBank({ bank_name: v.bank_name ?? '', account_number: v.account_number ?? '', account_name: v.account_name ?? '' });
      }
      if (userData.success && userData.data) {
        const u = userData.data;
        setAccount({ name: u.user.name ?? '', email: u.user.email ?? '', phone: u.user.phone ?? '' });
      }
      console.log('fetched settings', { vendorData, userData });
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const saveStore = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${API_URL}/vendors/me`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(store) });
      const data = await res.json();
      if (data.success) toast.success('Store settings saved!');
      else toast.error(data.message ?? 'Save failed');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const saveAccount = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${API_URL}/auth/profile`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(account) });
      const data = await res.json();
      if (data.success) toast.success('Account updated!');
      else toast.error(data.message ?? 'Update failed');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ current_password: pw.current, new_password: pw.newPw }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Password changed!'); setPw({ current:'', newPw:'', confirm:'' }); }
      else toast.error(data.message ?? 'Change failed');
    } catch { toast.error('Change failed'); }
    finally { setSaving(false); }
  };

  const saveBank = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${API_URL}/vendors/bank-details`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(bank) });
      const data = await res.json();
      if (data.success) toast.success('Bank details saved!');
      else toast.error(data.message ?? 'Save failed');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
        ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LastMart</p>
            <p className="text-orange-400 text-xs font-medium">Vendor Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${n.active ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-800 pt-3">
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full transition-colors">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Store className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Settings</h1>
              <p className="text-xs text-gray-500">Manage your store and account preferences</p>
            </div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 max-w-lg">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
                  ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 animate-pulse space-y-4">
              {Array.from({length:4}).map((_,i)=><div key={i} className="h-10 bg-gray-200 rounded-lg" />)}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Store Tab */}
              {tab === 'Store' && (
                <div className="space-y-4 max-w-xl">
                  <h2 className="font-black text-gray-900 text-lg mb-2">Store Information</h2>
                  <Field label="Store Name">
                    <Input value={store.store_name} onChange={(e:any)=>setStore(s=>({...s,store_name:e.target.value}))} placeholder="Your store name" />
                  </Field>
                  <Field label="Description">
                    <textarea rows={3} value={store.description} onChange={(e:any)=>setStore(s=>({...s,description:e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      placeholder="Tell customers about your store" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Category">
                      <Input value={store.category} onChange={(e:any)=>setStore(s=>({...s,category:e.target.value}))} placeholder="e.g. Grocery" />
                    </Field>
                    <Field label="City">
                      <Input value={store.city} onChange={(e:any)=>setStore(s=>({...s,city:e.target.value}))} placeholder="e.g. Lagos" />
                    </Field>
                  </div>
                  <Field label="Address">
                    <Input value={store.address} onChange={(e:any)=>setStore(s=>({...s,address:e.target.value}))} placeholder="Full store address" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Delivery Radius (km)">
                      <Input type="number" value={store.delivery_radius} onChange={(e:any)=>setStore(s=>({...s,delivery_radius:e.target.value}))} />
                    </Field>
                    <Field label="Min. Order (₦)">
                      <Input type="number" value={store.min_order} onChange={(e:any)=>setStore(s=>({...s,min_order:e.target.value}))} />
                    </Field>
                  </div>
                  <Field label="Opening Hours">
                    <Input value={store.opening_hours} onChange={(e:any)=>setStore(s=>({...s,opening_hours:e.target.value}))} placeholder="e.g. 8am – 8pm daily" />
                  </Field>
                  <button onClick={saveStore} disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-60">
                    <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}

              {/* Account Tab */}
              {tab === 'Account' && (
                <div className="space-y-6 max-w-xl">
                  <div className="space-y-4">
                    <h2 className="font-black text-gray-900 text-lg">Account Details</h2>
                    <Field label="Full Name"><Input value={account.name} onChange={(e:any)=>setAccount(a=>({...a,name:e.target.value}))} /></Field>
                    <Field label="Email"><Input type="email" value={account.email} onChange={(e:any)=>setAccount(a=>({...a,email:e.target.value}))} /></Field>
                    <Field label="Phone"><Input value={account.phone} onChange={(e:any)=>setAccount(a=>({...a,phone:e.target.value}))} /></Field>
                    <button onClick={saveAccount} disabled={saving}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm disabled:opacity-60">
                      <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Update Account'}
                    </button>
                  </div>
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <h2 className="font-black text-gray-900 text-lg">Change Password</h2>
                    <Field label="Current Password">
                      <div className="relative">
                        <Input type={showPw ? 'text' : 'password'} value={pw.current} onChange={(e:any)=>setPw(p=>({...p,current:e.target.value}))} />
                        <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="New Password"><Input type="password" value={pw.newPw} onChange={(e:any)=>setPw(p=>({...p,newPw:e.target.value}))} /></Field>
                    <Field label="Confirm New Password"><Input type="password" value={pw.confirm} onChange={(e:any)=>setPw(p=>({...p,confirm:e.target.value}))} /></Field>
                    <button onClick={changePassword} disabled={saving}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm disabled:opacity-60">
                      <Lock className="w-4 h-4" />{saving ? 'Changing…' : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Tab */}
              {tab === 'Bank' && (
                <div className="space-y-4 max-w-xl">
                  <h2 className="font-black text-gray-900 text-lg mb-2">Bank Details</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">Bank details are used for payout processing. Ensure accuracy to avoid payment delays.</p>
                  </div>
                  <Field label="Bank Name"><Input value={bank.bank_name} onChange={(e:any)=>setBank(b=>({...b,bank_name:e.target.value}))} placeholder="e.g. GTBank" /></Field>
                  <Field label="Account Number"><Input value={bank.account_number} onChange={(e:any)=>setBank(b=>({...b,account_number:e.target.value}))} placeholder="10-digit account number" /></Field>
                  <Field label="Account Name"><Input value={bank.account_name} onChange={(e:any)=>setBank(b=>({...b,account_name:e.target.value}))} placeholder="Account holder name" /></Field>
                  <button onClick={saveBank} disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm disabled:opacity-60">
                    <CreditCard className="w-4 h-4" />{saving ? 'Saving…' : 'Save Bank Details'}
                  </button>
                </div>
              )}

              {/* Notifications Tab */}
              {tab === 'Notifications' && (
                <div className="space-y-4 max-w-xl">
                  <h2 className="font-black text-gray-900 text-lg mb-2">Notification Preferences</h2>
                  {[
                    { key: 'new_order',    label: 'New Orders',         desc: 'Get notified when a customer places an order' },
                    { key: 'order_update', label: 'Order Updates',       desc: 'Notifications on order status changes' },
                    { key: 'payout',       label: 'Payout Alerts',       desc: 'Get notified when payouts are processed' },
                    { key: 'marketing',    label: 'Marketing & Tips',    desc: 'Receive tips and promotional updates from LastMart' },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{n.label}</p>
                        <p className="text-xs text-gray-500">{n.desc}</p>
                      </div>
                      <button onClick={() => setNotifs(prev => ({...prev, [n.key]: !prev[n.key as keyof typeof prev]}))}
                        className={`relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0 ${notifs[n.key as keyof typeof notifs] ? 'bg-orange-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifs[n.key as keyof typeof notifs] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => toast.success('Notification preferences saved!')}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm">
                    <Save className="w-4 h-4" />Save Preferences
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
