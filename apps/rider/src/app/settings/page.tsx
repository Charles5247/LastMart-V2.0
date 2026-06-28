'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, Bike, Package, DollarSign, Bell, LogOut, Save, Eye, EyeOff, Lock } from 'lucide-react';
import { getStoredToken, clearStoredToken, isRiderAuthenticated } from '@/lib/auth';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const NAV = [
  { href: '/dashboard',  icon: Bike,       label: 'Dashboard' },
  { href: '/deliveries', icon: Package,    label: 'Deliveries' },
  { href: '/earnings',   icon: DollarSign, label: 'Earnings' },
  { href: '/settings',   icon: Settings,   label: 'Settings', active: true },
];

export default function RiderSettingsPage() {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [tab,     setTab]     = useState('Account');

  const [account, setAccount] = useState({ name: '', email: '', phone: '', city: '' });
  const [vehicle, setVehicle] = useState({ vehicle_type: 'motorcycle', license_plate: '' });
  const [bank,    setBank]    = useState({ bank_name: '', account_number: '', account_name: '' });
  const [pw,      setPw]      = useState({ current: '', newPw: '', confirm: '' });

  const token = getStoredToken();
  const hdrs  = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!isRiderAuthenticated()) { router.replace('/auth/login'); return; }
    (async () => {
      try {
        const res  = await fetch(`${API}/auth/me`, { headers: hdrs() });
        const data = await res.json();
        if (data.success && data.data) {
          const u = data.data;
          setAccount({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '', city: u.city ?? '' });
          setVehicle({ vehicle_type: u.vehicle_type ?? 'motorcycle', license_plate: u.license_plate ?? '' });
          setBank({ bank_name: u.bank_name ?? '', account_number: u.account_number ?? '', account_name: u.account_name ?? '' });
        }
      } catch { toast.error('Failed to load settings'); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async (endpoint: string, body: object) => {
    setSaving(true);
    try {
      const res  = await fetch(`${API}${endpoint}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) toast.success('Saved!');
      else toast.error(data.message ?? 'Save failed');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.newPw.length < 8) { toast.error('Min 8 characters'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/auth/change-password`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ current_password: pw.current, new_password: pw.newPw }) });
      const data = await res.json();
      if (data.success) { toast.success('Password changed!'); setPw({ current:'', newPw:'', confirm:'' }); }
      else toast.error(data.message ?? 'Failed');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const logout = () => { clearStoredToken(); router.replace('/auth/login'); };
  const inp = (value: string, onChange: (v: string) => void, type = 'text', placeholder = '') => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto flex flex-col`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center"><Bike className="w-5 h-5 text-white" /></div>
          <div><p className="text-white font-bold text-sm">LastMart</p><p className="text-green-400 text-xs font-medium">Rider Portal</p></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${n.active ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-800 pt-3">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 w-full"><LogOut className="w-4 h-4" />Sign Out</button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100"><Bike className="w-5 h-5" /></button>
            <div><h1 className="text-xl font-black text-gray-900">Settings</h1><p className="text-xs text-gray-500">Manage your account and preferences</p></div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 max-w-md">
            {['Account','Vehicle','Bank','Password'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
            {loading ? <div className="animate-pulse space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-12 bg-gray-200 rounded-xl" />)}</div> : <>
              {tab === 'Account' && <>
                <h2 className="font-black text-gray-900">Account Details</h2>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>{inp(account.name, v => setAccount(a=>({...a,name:v})))}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>{inp(account.email, v => setAccount(a=>({...a,email:v})), 'email')}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>{inp(account.phone, v => setAccount(a=>({...a,phone:v})))}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">City</label>{inp(account.city, v => setAccount(a=>({...a,city:v})), 'text', 'e.g. Lagos')}</div>
                <button onClick={() => save('/auth/profile', account)} disabled={saving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}</button>
              </>}
              {tab === 'Vehicle' && <>
                <h2 className="font-black text-gray-900">Vehicle Details</h2>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Type</label>
                  <select value={vehicle.vehicle_type} onChange={e=>setVehicle(v=>({...v,vehicle_type:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="bicycle">Bicycle</option><option value="motorcycle">Motorcycle</option><option value="car">Car</option><option value="tricycle">Tricycle</option>
                  </select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">License Plate</label>{inp(vehicle.license_plate, v=>setVehicle(veh=>({...veh,license_plate:v})), 'text', 'e.g. LND-234-AA')}</div>
                <button onClick={() => save('/riders/vehicle', vehicle)} disabled={saving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Vehicle'}</button>
              </>}
              {tab === 'Bank' && <>
                <h2 className="font-black text-gray-900">Bank Details</h2>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name</label>{inp(bank.bank_name, v=>setBank(b=>({...b,bank_name:v})), 'text', 'e.g. GTBank')}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>{inp(bank.account_number, v=>setBank(b=>({...b,account_number:v})), 'text', '10-digit account number')}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>{inp(bank.account_name, v=>setBank(b=>({...b,account_name:v})))}</div>
                <button onClick={() => save('/riders/bank', bank)} disabled={saving} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Bank Details'}</button>
              </>}
              {tab === 'Password' && <>
                <h2 className="font-black text-gray-900">Change Password</h2>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                  <div className="relative">{inp(pw.current, v=>setPw(p=>({...p,current:v})), showPw ? 'text' : 'password')}
                    <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}</button></div></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>{inp(pw.newPw, v=>setPw(p=>({...p,newPw:v})), 'password', 'Min. 8 characters')}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>{inp(pw.confirm, v=>setPw(p=>({...p,confirm:v})), 'password')}</div>
                <button onClick={changePassword} disabled={saving} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"><Lock className="w-4 h-4" />{saving ? 'Changing…' : 'Change Password'}</button>
              </>}
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}
