'use client';
/**
 * ─── Budget Planner Page ──────────────────────────────────────────────────────
 * Allows customers to:
 *   1. Create shopping budget plans (daily / weekly / monthly / quarterly).
 *   2. Track spending vs. budget.
 *   3. Schedule recurring product purchases linked to a budget plan.
 *   4. Manually trigger recurring orders.
 *
 * All data is persisted server-side via /api/budget/* endpoints.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useApp } from '@/components/AppContext';
import toast from 'react-hot-toast';
import {
  Wallet, Plus, Trash2, Edit, Play, Pause, RotateCcw, TrendingUp,
  Calendar, RefreshCw, Package, ChevronRight, X, Loader, AlertTriangle
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface BudgetPlan {
  id: string; name: string; total_budget: number; spent: number;
  remaining: number; spent_pct: number; period: string;
  start_date: string; end_date?: string; is_active: number; notes?: string;
}

interface RecurringPurchase {
  id: string; product_name: string; product_price: number;
  product_images: string[]; vendor_name: string; quantity: number;
  frequency: string; next_order_date: string; is_active: number;
  auto_order: number; plan_name?: string; delivery_label?: string;
}

const PERIODS   = ['daily', 'weekly', 'monthly', 'quarterly'];
const FREQS     = ['daily', 'weekly', 'monthly', 'quarterly'];
const FREQ_ICON: Record<string, string> = { daily: '🌅', weekly: '📅', monthly: '🗓️', quarterly: '📊' };

export default function BudgetPage() {
  const { token, user } = useApp();
  const router          = useRouter();

  const [plans,     setPlans]     = useState<BudgetPlan[]>([]);
  const [recurs,    setRecurs]    = useState<RecurringPurchase[]>([]);
  const [products,  setProducts]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  /* ── Modal state ────────────────────────────────────────────────────────── */
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showRecurForm, setShowRecurForm] = useState(false);
  const [editPlan,     setEditPlan]     = useState<BudgetPlan | null>(null);

  const [planForm, setPlanForm] = useState({
    name: '', total_budget: '', period: 'monthly',
    start_date: new Date().toISOString().split('T')[0], end_date: '', notes: ''
  });

  const [recurForm, setRecurForm] = useState({
    product_id: '', quantity: 1, frequency: 'monthly',
    budget_plan_id: '', auto_order: false
  });

  const [productSearch, setProductSearch] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  /* ── Fetch data ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!token) { router.push('/auth/login'); return; }
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, recurRes] = await Promise.all([
        fetch('/api/budget/plans',     { headers }).then(r => r.json()),
        fetch('/api/budget/recurring', { headers }).then(r => r.json()),
      ]);
      if (plansRes.success) setPlans(plansRes.data);
      if (recurRes.success) setRecurs(recurRes.data);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  };

  const searchProducts = async (q: string) => {
    if (q.length < 2) { setProducts([]); return; }
    const res  = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=10`);
    const data = await res.json();
    if (data.success) setProducts(data.data);
  };

  /* ── Plan CRUD ───────────────────────────────────────────────────────────── */
  const savePlan = async () => {
    if (!planForm.name || !planForm.total_budget || !planForm.period || !planForm.start_date) {
      toast.error('Fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const method = editPlan ? 'PUT' : 'POST';
      const url    = editPlan ? `/api/budget/plans/${editPlan.id}` : '/api/budget/plans';
      const res    = await fetch(url, { method, headers, body: JSON.stringify(planForm) });
      const data   = await res.json();
      if (data.success) {
        toast.success(editPlan ? 'Plan updated' : 'Budget plan created');
        setShowPlanForm(false);
        setEditPlan(null);
        setPlanForm({ name: '', total_budget: '', period: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' });
        fetchAll();
      } else { toast.error(data.error); }
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this budget plan?')) return;
    await fetch(`/api/budget/plans/${id}`, { method: 'DELETE', headers });
    toast.success('Plan deleted');
    fetchAll();
  };

  const togglePlan = async (plan: BudgetPlan) => {
    await fetch(`/api/budget/plans/${plan.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ is_active: plan.is_active ? 0 : 1 })
    });
    fetchAll();
  };

  /* ── Recurring CRUD ──────────────────────────────────────────────────────── */
  const saveRecurring = async () => {
    if (!recurForm.product_id || !recurForm.frequency) {
      toast.error('Select a product and frequency'); return;
    }
    setSaving(true);
    try {
      const res  = await fetch('/api/budget/recurring', { method: 'POST', headers, body: JSON.stringify(recurForm) });
      const data = await res.json();
      if (data.success) {
        toast.success('Recurring purchase scheduled');
        setShowRecurForm(false);
        setRecurForm({ product_id: '', quantity: 1, frequency: 'monthly', budget_plan_id: '', auto_order: false });
        setProducts([]);
        setProductSearch('');
        fetchAll();
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to schedule'); }
    setSaving(false);
  };

  const cancelRecurring = async (id: string) => {
    if (!confirm('Cancel this recurring purchase?')) return;
    await fetch(`/api/budget/recurring/${id}`, { method: 'DELETE', headers });
    toast.success('Recurring purchase cancelled');
    fetchAll();
  };

  const toggleRecurring = async (r: RecurringPurchase) => {
    await fetch(`/api/budget/recurring/${r.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ is_active: r.is_active ? 0 : 1 })
    });
    fetchAll();
  };

  const triggerNow = async (id: string, productName: string) => {
    if (!confirm(`Place an order for "${productName}" now?`)) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/budget/recurring/${id}/trigger`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order placed! Total: ₦${data.data.total?.toLocaleString()}`);
        fetchAll();
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to trigger order'); }
    setSaving(false);
  };

  /* ── Formatting helpers ─────────────────────────────────────────────────── */
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

  const periodLabel = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

  if (!user) return null;

  /* ─── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-orange-500" size={26} /> Budget Planner
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Set spending budgets and automate recurring purchases
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader size={32} className="animate-spin text-orange-500" />
            </div>
          )}

          {!loading && (
            <div className="space-y-8">

              {/* ══════════════════ BUDGET PLANS ══════════════════════════════ */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">My Budget Plans</h2>
                  <button onClick={() => { setEditPlan(null); setShowPlanForm(true); }}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                    <Plus size={15} /> New Plan
                  </button>
                </div>

                {/* Plan create / edit modal */}
                {showPlanForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {editPlan ? 'Edit Plan' : 'Create Budget Plan'}
                        </h3>
                        <button onClick={() => { setShowPlanForm(false); setEditPlan(null); }}
                          className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="label">Plan Name *</label>
                          <input className="input" placeholder="e.g. Monthly Groceries"
                            value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Budget Amount (₦) *</label>
                          <input type="number" className="input" placeholder="50000"
                            value={planForm.total_budget} onChange={e => setPlanForm(f => ({ ...f, total_budget: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Period *</label>
                          <select className="input" value={planForm.period}
                            onChange={e => setPlanForm(f => ({ ...f, period: e.target.value }))}>
                            {PERIODS.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Start Date *</label>
                          <input type="date" className="input" value={planForm.start_date}
                            onChange={e => setPlanForm(f => ({ ...f, start_date: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">End Date (optional)</label>
                          <input type="date" className="input" value={planForm.end_date}
                            onChange={e => setPlanForm(f => ({ ...f, end_date: e.target.value }))} />
                        </div>
                        <div className="col-span-2">
                          <label className="label">Notes</label>
                          <input className="input" placeholder="Optional notes about this budget…"
                            value={planForm.notes} onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowPlanForm(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                        <button onClick={savePlan} disabled={saving}
                          className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                          {saving && <Loader size={14} className="animate-spin" />}
                          {editPlan ? 'Update' : 'Create'} Plan
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {plans.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border-2 border-dashed border-gray-200">
                    <Wallet size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No budget plans yet. Create one to start tracking spending.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map(plan => (
                      <div key={plan.id}
                        className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 transition-all
                          ${plan.spent_pct >= 90 ? 'border-red-400' :
                            plan.spent_pct >= 70 ? 'border-yellow-400' : 'border-green-400'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {FREQ_ICON[plan.period]} {periodLabel(plan.period)} budget
                              {!plan.is_active && <span className="ml-2 text-gray-400">(paused)</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => togglePlan(plan)}
                              className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                              title={plan.is_active ? 'Pause' : 'Resume'}>
                              {plan.is_active ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <button onClick={() => { setEditPlan(plan); setPlanForm({ ...plan, total_budget: String(plan.total_budget), end_date: plan.end_date || '', notes: plan.notes || '' }); setShowPlanForm(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => deletePlan(plan.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Spent: {fmt(plan.spent)}</span>
                            <span>{plan.spent_pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500
                                ${plan.spent_pct >= 90 ? 'bg-red-400' :
                                  plan.spent_pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                              style={{ width: `${Math.min(plan.spent_pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Budget: <strong className="text-gray-800">{fmt(plan.total_budget)}</strong></span>
                          <span className={`font-semibold ${plan.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {plan.remaining < 0 ? 'Over by ' : 'Left: '}{fmt(Math.abs(plan.remaining))}
                          </span>
                        </div>

                        {plan.spent_pct >= 80 && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">
                            <AlertTriangle size={12} /> You've used {plan.spent_pct}% of this budget
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ══════════════════ RECURRING PURCHASES ══════════════════════ */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Recurring Purchases</h2>
                  <button onClick={() => setShowRecurForm(true)}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                    <Plus size={15} /> Schedule Purchase
                  </button>
                </div>

                {/* Recurring form modal */}
                {showRecurForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 text-lg">Schedule Recurring Purchase</h3>
                        <button onClick={() => { setShowRecurForm(false); setProducts([]); setProductSearch(''); }}
                          className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                      </div>

                      {/* Product search */}
                      <div>
                        <label className="label">Search Product *</label>
                        <input className="input" placeholder="Type to search products…"
                          value={productSearch}
                          onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }} />
                        {products.length > 0 && (
                          <ul className="mt-1 border border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                            {products.map(p => (
                              <li key={p.id}>
                                <button
                                  onClick={() => { setRecurForm(f => ({ ...f, product_id: p.id })); setProductSearch(p.name); setProducts([]); }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-orange-50 text-sm
                                    ${recurForm.product_id === p.id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'}`}>
                                  <Package size={13} />
                                  <span className="flex-1">{p.name}</span>
                                  <span className="text-gray-500">₦{Number(p.price).toLocaleString()}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Quantity</label>
                          <input type="number" min="1" className="input" value={recurForm.quantity}
                            onChange={e => setRecurForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div>
                          <label className="label">Frequency *</label>
                          <select className="input" value={recurForm.frequency}
                            onChange={e => setRecurForm(f => ({ ...f, frequency: e.target.value }))}>
                            {FREQS.map(freq => (
                              <option key={freq} value={freq}>{FREQ_ICON[freq]} {periodLabel(freq)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="label">Linked Budget Plan (optional)</label>
                          <select className="input" value={recurForm.budget_plan_id}
                            onChange={e => setRecurForm(f => ({ ...f, budget_plan_id: e.target.value }))}>
                            <option value="">— None —</option>
                            {plans.filter(p => p.is_active).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={recurForm.auto_order}
                          onChange={e => setRecurForm(f => ({ ...f, auto_order: e.target.checked }))} />
                        Auto-place order on each due date (requires valid payment method)
                      </label>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowRecurForm(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                        <button onClick={saveRecurring} disabled={saving}
                          className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                          {saving && <Loader size={14} className="animate-spin" />}
                          Schedule
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {recurs.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border-2 border-dashed border-gray-200">
                    <RefreshCw size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No recurring purchases. Schedule products you buy regularly.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recurs.map(r => (
                      <div key={r.id}
                        className={`bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4
                          ${!r.is_active ? 'opacity-60' : ''}`}>
                        <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                          {r.product_images?.[0]
                            ? <img src={r.product_images[0]} alt={r.product_name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800">{r.product_name}</p>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                              {FREQ_ICON[r.frequency]} {periodLabel(r.frequency)}
                            </span>
                            {r.auto_order === 1 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Auto</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Qty: {r.quantity} · {fmt(r.product_price * r.quantity)}/order
                            {r.plan_name && ` · ${r.plan_name}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={11} />
                            Next order: {new Date(r.next_order_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => triggerNow(r.id, r.product_name)} disabled={saving}
                            title="Order now" className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                            {saving ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                          </button>
                          <button onClick={() => toggleRecurring(r)}
                            title={r.is_active ? 'Pause' : 'Resume'}
                            className="p-2 text-gray-400 hover:text-orange-500 transition-colors">
                            {r.is_active ? <Pause size={14} /> : <RotateCcw size={14} />}
                          </button>
                          <button onClick={() => cancelRecurring(r.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
