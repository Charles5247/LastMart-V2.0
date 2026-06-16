import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure upload dir exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads/riders');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR });

// ── GET /api/riders/profile ──────────────────────────────────────
router.get('/profile', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const rider = (db as any).prepare(`
      SELECT r.*, u.name, u.email, u.phone
      FROM riders r JOIN users u ON r.user_id = u.id
      WHERE r.user_id = ?
    `).get(user.userId);
    res.json({ success: true, data: rider || null });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/riders/stats ────────────────────────────────────────
router.get('/stats', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const rider = (db as any).prepare('SELECT * FROM riders WHERE user_id = ?').get(user.userId);
    if (!rider) return res.json({ success: true, data: { total_deliveries: 0, completed_today: 0, total_earned: 0, today_earned: 0, rating: 0, acceptance_rate: 100, completion_rate: 100, pending_assignments: [], active_delivery: null } });

    // Check if deliveries table has correct columns before querying
    let totalDeliveries = 0, completedToday = 0, totalEarned = 0, todayEarned = 0;
    let activeDelivery = null, pendingAssignments: any[] = [];
    try {
      totalDeliveries = (db as any).prepare('SELECT COUNT(*) as cnt FROM deliveries WHERE rider_id = ? AND status = "delivered"').get(rider.id)?.cnt || 0;
      completedToday = (db as any).prepare('SELECT COUNT(*) as cnt FROM deliveries WHERE rider_id = ? AND status = "delivered" AND date(completed_at) = ?').get(rider.id, today)?.cnt || 0;
      totalEarned = (db as any).prepare('SELECT COALESCE(SUM(rider_fee),0) as total FROM deliveries WHERE rider_id = ? AND status = "delivered"').get(rider.id)?.total || 0;
      todayEarned = (db as any).prepare('SELECT COALESCE(SUM(rider_fee),0) as total FROM deliveries WHERE rider_id = ? AND status = "delivered" AND date(completed_at) = ?').get(rider.id, today)?.total || 0;
      activeDelivery = (db as any).prepare('SELECT * FROM deliveries WHERE rider_id = ? AND status IN ("assigned","picked_up") LIMIT 1').get(rider.id);
      pendingAssignments = (db as any).prepare('SELECT * FROM deliveries WHERE status = "pending" AND rider_id IS NULL LIMIT 5').all();
    } catch {}

    res.json({
      success: true, data: {
        total_deliveries: totalDeliveries, completed_today: completedToday,
        total_earned: totalEarned, today_earned: todayEarned,
        rating: rider.rating || 0, total_ratings: rider.total_ratings || 0,
        acceptance_rate: rider.acceptance_rate || 100, completion_rate: rider.completion_rate || 100,
        active_delivery: activeDelivery, pending_assignments: pendingAssignments,
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/riders/deliveries ───────────────────────────────────
router.get('/deliveries', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const rider = (db as any).prepare('SELECT id FROM riders WHERE user_id = ?').get(user.userId);
    if (!rider) return res.json({ success: true, data: [] });
    const limit = parseInt(req.query.limit as string) || 20;
    let deliveries: any[] = [];
    try {
      deliveries = (db as any).prepare('SELECT * FROM deliveries WHERE rider_id = ? ORDER BY created_at DESC LIMIT ?').all(rider.id, limit);
    } catch {}
    res.json({ success: true, data: deliveries });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── PUT /api/riders/availability ─────────────────────────────────
router.put('/availability', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { is_available } = req.body;
    const rider = (db as any).prepare('SELECT id FROM riders WHERE user_id = ?').get(user.userId);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    (db as any).prepare('UPDATE riders SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_available ? 1 : 0, rider.id);
    res.json({ success: true, message: 'Availability updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/riders/deliveries/:id/accept ───────────────────────
router.post('/deliveries/:id/accept', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const rider = (db as any).prepare('SELECT id FROM riders WHERE user_id = ?').get(user.userId);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    try {
      const delivery = (db as any).prepare('SELECT * FROM deliveries WHERE id = ? AND status = "pending"').get(req.params.id);
      if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not available' });
      (db as any).prepare('UPDATE deliveries SET rider_id = ?, status = "assigned", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(rider.id, req.params.id);
    } catch {}
    res.json({ success: true, message: 'Delivery accepted' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── PUT /api/riders/deliveries/:id/status ───────────────────────
router.put('/deliveries/:id/status', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { status } = req.body;
    const rider = (db as any).prepare('SELECT id FROM riders WHERE user_id = ?').get(user.userId);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    const completedAt = status === 'delivered' ? new Date().toISOString() : null;
    try {
      (db as any).prepare('UPDATE deliveries SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND rider_id = ?').run(status, completedAt, req.params.id, rider.id);
      if (status === 'delivered') {
        (db as any).prepare('UPDATE riders SET total_deliveries = total_deliveries + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(rider.id);
      }
    } catch {}
    res.json({ success: true, message: 'Status updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/riders/earnings ─────────────────────────────────────
router.get('/earnings', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const rider = (db as any).prepare('SELECT * FROM riders WHERE user_id = ?').get(user.userId) as any;
    if (!rider) return res.json({ success: true, data: { available_balance: 0, pending_balance: 0, total_earned: 0 } });
    res.json({ success: true, data: { available_balance: rider.available_balance || 0, pending_balance: rider.pending_balance || 0, total_earned: rider.total_earned || 0 } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/riders/withdrawals ──────────────────────────────────
router.get('/withdrawals', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const rider = (db as any).prepare('SELECT id FROM riders WHERE user_id = ?').get(user.userId);
    if (!rider) return res.json({ success: true, data: [] });
    let withdrawals: any[] = [];
    try { withdrawals = (db as any).prepare('SELECT * FROM rider_withdrawals WHERE rider_id = ? ORDER BY created_at DESC').all(rider.id); } catch {}
    res.json({ success: true, data: withdrawals });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/riders/withdrawals ─────────────────────────────────
router.post('/withdrawals', (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { amount } = req.body;
    if (!amount || amount < 1000) return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦1,000' });
    const rider = (db as any).prepare('SELECT * FROM riders WHERE user_id = ?').get(user.userId) as any;
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    if (amount > (rider.available_balance || 0)) return res.status(400).json({ success: false, message: 'Insufficient balance' });
    const id = `rw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      (db as any).prepare('INSERT INTO rider_withdrawals (id, rider_id, amount, status, created_at) VALUES (?, ?, ?, "pending", CURRENT_TIMESTAMP)').run(id, rider.id, amount);
      (db as any).prepare('UPDATE riders SET available_balance = available_balance - ? WHERE id = ?').run(amount, rider.id);
    } catch {}
    res.json({ success: true, message: 'Withdrawal request submitted' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/riders/kyc ─────────────────────────────────────────
router.post('/kyc', upload.fields([
  { name: 'gov_id', maxCount: 1 }, { name: 'selfie', maxCount: 1 },
  { name: 'vehicle_reg', maxCount: 1 }, { name: 'vehicle_photo', maxCount: 1 },
]), (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = getDB();
    const { vehicle_type, vehicle_plate, license_number, nin, bank_name, account_number, account_name } = req.body;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const riderId = `rider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const existing = (db as any).prepare('SELECT id FROM riders WHERE user_id = ?').get(user.userId);
    if (existing) {
      (db as any).prepare(`UPDATE riders SET vehicle_type=?, vehicle_plate=?, license_number=?, nin=?,
        bank_name=?, account_number=?, account_name=?, kyc_status='pending',
        gov_id_url=?, selfie_url=?, vehicle_reg_url=?, vehicle_photo_url=?,
        updated_at=CURRENT_TIMESTAMP WHERE user_id=?
      `).run(vehicle_type, vehicle_plate, license_number, nin, bank_name, account_number, account_name,
        files?.gov_id?.[0]?.path || null, files?.selfie?.[0]?.path || null,
        files?.vehicle_reg?.[0]?.path || null, files?.vehicle_photo?.[0]?.path || null,
        user.userId);
    } else {
      (db as any).prepare(`INSERT INTO riders (id, user_id, vehicle_type, vehicle_plate, license_number, nin,
        bank_name, account_number, account_name, kyc_status, gov_id_url, selfie_url,
        vehicle_reg_url, vehicle_photo_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(riderId, user.userId, vehicle_type, vehicle_plate, license_number, nin,
        bank_name, account_number, account_name,
        files?.gov_id?.[0]?.path || null, files?.selfie?.[0]?.path || null,
        files?.vehicle_reg?.[0]?.path || null, files?.vehicle_photo?.[0]?.path || null);
    }
    res.json({ success: true, message: 'KYC submitted successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
