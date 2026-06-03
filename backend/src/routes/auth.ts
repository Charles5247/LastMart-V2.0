import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { signToken } from '../lib/auth';
import { seedDatabase } from '../lib/seed';
import { sendEmail, EmailTemplates } from '../lib/email';
import { requireAuth } from '../lib/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    await seedDatabase();
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(user.id);
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    const { password: _, ...userWithoutPassword } = user;

    res.cookie('auth_token', token, {
      httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      data: { user: userWithoutPassword, vendor: vendorInfo, token },
      message: 'Login successful'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    await seedDatabase();
    const db = getDB();
    const { name, email, password, role, city, phone, address, latitude, longitude, store_name, store_description, category, referral_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const userRole = role || 'customer';

    db.prepare(`INSERT INTO users (id, name, email, password, role, city, phone, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      userId, name, email, hashedPassword, userRole, city || null, phone || null, address || null, latitude || null, longitude || null
    );

    if (userRole === 'vendor') {
      if (!store_name) return res.status(400).json({ success: false, error: 'Store name is required for vendors' });
      const vendorId = uuidv4();
      db.prepare(`INSERT INTO vendors (id, user_id, store_name, description, category, city, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        vendorId, userId, store_name, store_description || null, category || null, city || '', latitude || null, longitude || null
      );
    }

    // ── Handle referral code if provided ──────────────────────────────────
    if (referral_code) {
      try {
        const referrer = db.prepare(`SELECT id FROM users WHERE referral_code = ?`).get(referral_code) as any;
        if (referrer && referrer.id !== userId) {
          // Generate 0.5% coupon for new user
          const couponCode = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          const couponId   = uuidv4();
          const refId      = uuidv4();
          db.prepare(`INSERT INTO coupons (id, code, type, value, description, max_uses, created_by) VALUES (?, ?, 'referral', 0.5, ?, 1, ?)`
            ).run(couponId, couponCode, `Referral welcome discount`, referrer.id);
          db.prepare(`UPDATE users SET referred_by = ? WHERE id = ?`).run(referrer.id, userId);
          db.prepare(`INSERT INTO referrals (id, referrer_id, referred_id, coupon_id, status) VALUES (?, ?, ?, ?, 'pending')`
            ).run(refId, referrer.id, userId, couponId);
          // Notify new user
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), userId, 'coupon', '🎉 Welcome Referral Discount!',
              `Use code "${couponCode}" for 0.5% off your next order!`,
              JSON.stringify({ coupon_code: couponCode, coupon_id: couponId }));
          // Notify referrer
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), referrer.id, 'referral', '👥 New Referral!',
              `Someone joined LastMart using your referral link!`,
              JSON.stringify({ referred_user_id: userId }));
        }
      } catch (refErr: any) {
        console.warn('Referral processing error (non-fatal):', refErr.message);
      }
    }

    const user = db.prepare('SELECT id, name, email, role, city, created_at FROM users WHERE id = ?').get(userId) as any;
    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie('auth_token', token, {
      httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ success: true, data: { user, token }, message: 'Registration successful' });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/forgot
router.post('/forgot', async (req: Request, res: Response) => {
  try {
    await seedDatabase();
    const db = getDB();
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email) as any;
    // Always respond success to avoid leaking which emails are registered
    if (!user) return res.json({ success: true });

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?').run(token, expires, user.id);

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendEmail({
      to: user.email,
      ...EmailTemplates.passwordReset(user.name || 'User', resetLink),
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/reset
router.post('/reset', async (req: Request, res: Response) => {
  try {
    await seedDatabase();
    const db = getDB();
    const { token, email, password } = req.body;
    if (!token || !email || !password) return res.status(400).json({ success: false, error: 'Token, email and new password are required' });

    const user = db.prepare('SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = ?').get(email) as any;
    if (!user || !user.password_reset_token) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    if (user.password_reset_token !== token) return res.status(400).json({ success: false, error: 'Invalid token' });
    if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) return res.status(400).json({ success: false, error: 'Token expired' });

    const hashed = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = (datetime("now")) WHERE id = ?').run(hashed, user.id);

    return res.json({ success: true, message: 'Password updated' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/admin-reset - admin can trigger a reset for any user
router.post('/admin-reset', async (req: Request, res: Response) => {
  try {
    const auth = requireAuth(req, ['admin']);
    if ('error' in auth) return res.status(auth.status).json({ success: false, error: auth.error });

    await seedDatabase();
    const db = getDB();
    const { user_id, email } = req.body;
    if (!user_id && !email) return res.status(400).json({ success: false, error: 'user_id or email required' });

    const user = user_id
      ? db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(user_id) as any
      : db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email) as any;

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const token = uuidv4();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours for admin-initiated
    db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?').run(token, expires, user.id);

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset?token=${token}&email=${encodeURIComponent(user.email)}`;
    // Send email to user
    await sendEmail({
      to: user.email,
      ...EmailTemplates.passwordReset(user.name || 'User', resetLink),
    });

    // Also return link to admin (caller) so they can share / print if needed
    return res.json({ success: true, resetLink });
  } catch (error: any) {
    console.error('Admin reset error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
