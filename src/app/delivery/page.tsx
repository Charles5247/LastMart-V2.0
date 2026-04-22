'use client';
/**
 * ─── Delivery Address Manager Page ───────────────────────────────────────────
 * Customers manage their saved delivery addresses and learn about available
 * delivery modes and their fees.
 *
 * Features:
 *   - View, add, edit, delete saved addresses
 *   - Set a default address (auto-selected at checkout)
 *   - Browse available delivery modes with fees & ETAs
 *   - GPS auto-fill for city field
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  MapPin, Plus, Edit, Trash2, Star, Navigation, X, Loader,
  Truck, Zap, Moon, Calendar, Store, Check, Info
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Address {
  id: string; label: string; recipient_name: string; recipient_phone: string;
  address: string; city: string; state?: string; country: string;
  latitude?: number; longitude?: number; is_default: number;
  delivery_instructions?: string; created_at: string;
}

interface DeliveryMode {
  id: string; label: string; description: string; fee: number; eta: string; icon: string;
}

const MODE_ICON_COMP: Record<string, React.ReactNode> = {
  standard:  <Truck    size={22} />,
  express:   <Zap      size={22} />,
  overnight: <Moon     size={22} />,
  scheduled: <Calendar size={22} />,
  pickup:    <Store    size={22} />,
};

const EMPTY_FORM = {
  label: 'Home', recipient_name: '', recipient_phone: '', address: '',
  city: '', state: '', country: 'Nigeria', latitude: '', longitude: '',
  delivery_instructions: '', is_default: false,
};

export default function DeliveryPage() {
  const { token, user, location, detectGPS, gpsLoading } = useApp();
  const router = useRouter();

  const [addresses,  setAddresses]  = useState<Address[]>([]);
  const [modes,      setModes]      = useState<DeliveryMode[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editAddr,   setEditAddr]   = useState<Address | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  /* ── Bootstrap ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!token) { router.push('/auth/login'); return; }
    fetchAll();
  }, [token]);

  /* Pre-fill city from app location when form opens */
  useEffect(() => {
    if (showForm && !editAddr && !form.city) {
      setForm(f => ({ ...f, city: location.city }));
    }
  }, [showForm, location.city]);

  const fetchAll = async () => {
    setLoading(true);
    const [addrRes, modeRes] = await Promise.all([
      fetch('/api/delivery/addresses', { headers }).then(r => r.json()),
      fetch('/api/delivery/modes',     { headers }).then(r => r.json()),
    ]);
    if (addrRes.success) setAddresses(addrRes.data);
    if (modeRes.success) setModes(modeRes.data);
    setLoading(false);
  };

  /* ── GPS fill ───────────────────────────────────────────────────────────── */
  const fillFromGPS = async () => {
    await detectGPS();
    setForm(f => ({ ...f, city: location.city }));
  };

  /* ── Save address ───────────────────────────────────────────────────────── */
  const saveAddress = async () => {
    if (!form.recipient_name || !form.recipient_phone || !form.address || !form.city) {
      toast.error('Fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const method = editAddr ? 'PUT' : 'POST';
      const url    = editAddr ? `/api/delivery/addresses/${editAddr.id}` : '/api/delivery/addresses';
      const res    = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data   = await res.json();
      if (data.success) {
        toast.success(editAddr ? 'Address updated' : 'Address saved');
        setShowForm(false);
        setEditAddr(null);
        setForm({ ...EMPTY_FORM });
        fetchAll();
      } else { toast.error(data.error); }
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  /* ── Delete address ─────────────────────────────────────────────────────── */
  const deleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await fetch(`/api/delivery/addresses/${id}`, { method: 'DELETE', headers });
    toast.success('Address deleted');
    fetchAll();
  };

  /* ── Set default ────────────────────────────────────────────────────────── */
  const setDefault = async (id: string) => {
    await fetch(`/api/delivery/addresses/${id}/default`, { method: 'PUT', headers });
    toast.success('Default address updated');
    fetchAll();
  };

  /* ── Open edit ──────────────────────────────────────────────────────────── */
  const openEdit = (addr: Address) => {
    setEditAddr(addr);
    setForm({
      label: addr.label, recipient_name: addr.recipient_name,
      recipient_phone: addr.recipient_phone, address: addr.address,
      city: addr.city, state: addr.state || '', country: addr.country || 'Nigeria',
      latitude: String(addr.latitude ?? ''), longitude: String(addr.longitude ?? ''),
      delivery_instructions: addr.delivery_instructions || '', is_default: !!addr.is_default,
    });
    setShowForm(true);
  };

  if (!user) return null;

  /* ─── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="text-orange-500" size={26} /> Delivery Addresses
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage saved addresses for fast checkout
              </p>
            </div>
            <button onClick={() => { setEditAddr(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
              <Plus size={15} /> Add Address
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader size={32} className="animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-8">

              {/* ════════════════ ADDRESSES ═══════════════════════════════════ */}
              <section>
                {addresses.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border-2 border-dashed border-gray-200">
                    <MapPin size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No addresses saved yet. Add your first address to speed up checkout.</p>
                    <button onClick={() => setShowForm(true)} className="btn-primary px-6">
                      Add Your First Address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <div key={addr.id}
                        className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all
                          ${addr.is_default === 1 ? 'border-orange-300' : 'border-transparent'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold
                              ${addr.label === 'Home' ? 'bg-blue-100 text-blue-700' :
                                addr.label === 'Work' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-600'}`}>
                              {addr.label}
                            </div>
                            {addr.is_default === 1 && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                <Check size={10} /> Default
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {addr.is_default !== 1 && (
                              <button onClick={() => setDefault(addr.id)}
                                title="Set as default"
                                className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors">
                                <Star size={14} />
                              </button>
                            )}
                            <button onClick={() => openEdit(addr)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => deleteAddress(addr.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-gray-800">{addr.recipient_name}</p>
                          <p className="text-gray-600">{addr.recipient_phone}</p>
                          <p className="text-gray-600 flex items-start gap-1">
                            <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
                            <span>{addr.address}, {addr.city}{addr.state ? `, ${addr.state}` : ''}</span>
                          </p>
                          {addr.delivery_instructions && (
                            <p className="text-gray-400 text-xs flex items-center gap-1">
                              <Info size={11} /> {addr.delivery_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ════════════════ DELIVERY MODES ═══════════════════════════════ */}
              <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Delivery Modes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modes.map(mode => (
                    <div key={mode.id}
                      className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
                      <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                        {MODE_ICON_COMP[mode.id] || <Truck size={20} />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 mb-0.5">{mode.label}</p>
                        <p className="text-xs text-gray-500 mb-2">{mode.description}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-600">⏱ {mode.eta}</span>
                          <span className={`font-bold ${mode.fee === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                            {mode.fee === 0 ? '🆓 FREE' : `₦${mode.fee.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}

          {/* ── Address Form Modal ──────────────────────────────────────────── */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {editAddr ? 'Edit Address' : 'Add New Address'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditAddr(null); }}
                    className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="space-y-4">
                  {/* Label */}
                  <div>
                    <label className="label">Label</label>
                    <div className="flex gap-2">
                      {['Home', 'Work', 'Other'].map(l => (
                        <button key={l} onClick={() => setForm(f => ({ ...f, label: l }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all
                            ${form.label === l ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Recipient Name *</label>
                      <input className="input" placeholder="Full name" value={form.recipient_name}
                        onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Phone Number *</label>
                      <input className="input" placeholder="+234…" value={form.recipient_phone}
                        onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Street Address *</label>
                    <input className="input" placeholder="House number, street name…" value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">City *</label>
                        <button onClick={fillFromGPS} disabled={gpsLoading}
                          className="flex items-center gap-1 text-xs text-orange-600 hover:underline disabled:opacity-50">
                          {gpsLoading ? <Loader size={11} className="animate-spin" /> : <Navigation size={11} />}
                          GPS
                        </button>
                      </div>
                      <input className="input" placeholder="Lagos" value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">State</label>
                      <input className="input" placeholder="Lagos State" value={form.state}
                        onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Delivery Instructions (optional)</label>
                    <input className="input" placeholder="Gate colour, nearest landmark, access code…"
                      value={form.delivery_instructions}
                      onChange={e => setForm(f => ({ ...f, delivery_instructions: e.target.value }))} />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_default}
                      onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
                    Set as my default delivery address
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setShowForm(false); setEditAddr(null); }}
                      className="btn-secondary flex-1 py-2.5">Cancel</button>
                    <button onClick={saveAddress} disabled={saving}
                      className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                      {saving && <Loader size={14} className="animate-spin" />}
                      {editAddr ? 'Update Address' : 'Save Address'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
