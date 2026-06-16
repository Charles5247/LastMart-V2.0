import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// ── GET /api/vendors/payout-balance ─────────────────────────────
router.get('/payout-balance', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const vendor = (db as any).prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: {
      available_balance: vendor.available_balance || 0,
      escrow_balance: vendor.escrow_balance || 0,
      total_paid: vendor.total_paid_out || 0,
      bank_details: { bank_name: vendor.bank_name || '', account_number: vendor.account_number || '', account_name: vendor.account_name || '' }
    }});
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/vendors/payouts ─────────────────────────────────────
router.get('/payouts', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.json({ success: true, data: [] });
    let payouts: any[] = [];
    try { payouts = (db as any).prepare('SELECT * FROM vendor_payouts WHERE vendor_id = ? ORDER BY created_at DESC').all(vendor.id); } catch {}
    res.json({ success: true, data: payouts });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/vendors/payouts ────────────────────────────────────
router.post('/payouts', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { amount } = req.body;
    if (!amount || amount < 5000) return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦5,000' });
    const vendor = (db as any).prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    if (amount > (vendor.available_balance || 0)) return res.status(400).json({ success: false, message: 'Insufficient balance' });
    const id = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      (db as any).prepare('INSERT INTO vendor_payouts (id, vendor_id, amount, bank_name, account_number, account_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "pending", CURRENT_TIMESTAMP)').run(id, vendor.id, amount, vendor.bank_name, vendor.account_number, vendor.account_name);
      (db as any).prepare('UPDATE vendors SET available_balance = available_balance - ? WHERE id = ?').run(amount, vendor.id);
    } catch {}
    res.json({ success: true, message: 'Withdrawal request submitted' });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PUT /api/vendors/bank-details ────────────────────────────────
router.put('/bank-details', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { bank_name, account_number, account_name } = req.body;
    if (!bank_name || !account_number || !account_name) return res.status(400).json({ success: false, message: 'All fields required' });
    const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    (db as any).prepare('UPDATE vendors SET bank_name=?, account_number=?, account_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(bank_name, account_number, account_name, vendor.id);
    res.json({ success: true, message: 'Bank details updated' });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/vendors/subscription ───────────────────────────────
router.get('/subscription', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const vendor = (db as any).prepare('SELECT subscription_tier, subscription_expires_at FROM vendors WHERE user_id = ?').get(user.userId) as any;
    res.json({ success: true, data: { tier: vendor?.subscription_tier || 'basic', expires_at: vendor?.subscription_expires_at } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /api/vendors/subscription/upgrade ───────────────────────
router.post('/subscription/upgrade', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { tier } = req.body;
    const validTiers = ['basic', 'starter', 'growth', 'enterprise'];
    if (!validTiers.includes(tier)) return res.status(400).json({ success: false, message: 'Invalid tier' });
    const vendor = (db as any).prepare('SELECT id FROM vendors WHERE user_id = ?').get(user.userId) as any;
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    (db as any).prepare('UPDATE vendors SET subscription_tier=?, subscription_expires_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(tier, expiresAt, vendor.id);
    res.json({ success: true, message: `Upgraded to ${tier}`, data: { tier, expires_at: expiresAt } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
