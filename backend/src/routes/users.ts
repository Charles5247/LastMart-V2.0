import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

function mapUserRow(user: any) {
  if (!user) return null;
  return {
    ...user,
    is_verified: user.is_verified === 1,
    is_suspended: user.is_suspended === 1,
    gps_enabled: user.gps_enabled === 1,
    terms_accepted: user.terms_accepted === 1,
    verification_expires_at: user.verification_expires_at ? new Date(user.verification_expires_at) : null,
  };
}

// GET /api/users/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userPayload.userId) as any;
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = db.prepare('SELECT * FROM vendors WHERE user_id = ?').all(userPayload.userId);
    }

    return res.json({ success: true, data: { user: mapUserRow(user), vendor: vendorInfo }, message: 'Profile fetched' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/users/me
router.put('/me', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { name, phone, address, city, latitude, longitude } = req.body;
    const db = getDB();

    db.prepare('UPDATE users SET name = ?, phone = ?, address = ?, city = ?, latitude = ?, longitude = ? WHERE id = ?')
      .run(name || null, phone || null, address || null, city || null, latitude || null, longitude || null, userPayload.userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userPayload.userId) as any;
    return res.json({ success: true, data: mapUserRow(updatedUser), message: 'Profile updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/saved-vendors
router.get('/saved-vendors', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const saved = db.prepare(
      `SELECT v.* FROM saved_vendors sv
       JOIN vendors v ON sv.vendor_id = v.id
       WHERE sv.user_id = ?
       ORDER BY sv.created_at DESC`
    ).all(userPayload.userId);

    return res.json({ success: true, data: saved, message: 'Saved vendors fetched' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/saved-vendors
router.post('/saved-vendors', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const { vendor_id } = req.body;

    const existing = db.prepare('SELECT id FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').get(userPayload.userId, vendor_id);
    if (existing) return res.status(400).json({ success: false, error: 'Already saved' });

    db.prepare('INSERT INTO saved_vendors (id, user_id, vendor_id) VALUES (?, ?, ?)')
      .run(uuidv4(), userPayload.userId, vendor_id);

    return res.json({ success: true, message: 'Vendor saved' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/saved-vendors
router.delete('/saved-vendors', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const vendorId = req.query.vendor_id as string;

    db.prepare('DELETE FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').run(userPayload.userId, vendorId);

    return res.json({ success: true, message: 'Vendor unsaved' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
