import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { getUserFromRequest, signToken } from '../lib/auth';
import { sendEmail, EmailTemplates } from '../lib/email';

const router = Router();

function generateVerificationCode(): { token: number; expiresIn: Date } {
  const token: number = Math.floor(100000 + Math.random() * 900000);
  const expiresIn: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expiresIn };
}

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

function createReferralCode(db: any) {
  let code: string;
  do {
    code = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code));
  return code;
}

function getUserByEmail(db: any, email: string): any {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
}

function getUserById(db: any, id: string): any {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
}

function getVendorByUserId(db: any, userId: string) {
  return db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userId);
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = getUserByEmail(db, email);
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    if (!user.is_verified) return res.status(401).json({ success: false, error: 'User not verified' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = getVendorByUserId(db, user.id);
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    const mappedUser = mapUserRow(user);
    const { password: _, ...userWithoutPassword } = mappedUser;

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
    const db = getDB();
    const { name, email, password, role, city, phone, address, latitude, longitude, store_name, store_description, category, referral_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    const existing = getUserByEmail(db, email);
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const userRole = role || 'customer';
    const { token, expiresIn } = generateVerificationCode();
    const referralCode = createReferralCode(db);
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    db.prepare(`INSERT INTO users (id, name, email, password, role, city, phone, address, latitude, longitude, is_verified, verification_token, verification_expires_at, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`)
      .run(userId, name, email, hashedPassword, userRole, city || null, phone || null, address || null, latitude || null, longitude || null, token, expiresIn.toISOString(), referralCode);

    if (userRole === 'vendor') {
      if (!store_name) return res.status(400).json({ success: false, error: 'Store name is required for vendors' });
      if (!city) return res.status(400).json({ success: false, error: 'City location is required for vendors' });

      db.prepare(`INSERT INTO vendors (id, user_id, store_name, description, category, city, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uuidv4(), userId, store_name, store_description || null, category || null, city, latitude || null, longitude || null);
    }

    let user = getUserById(db, userId);

    if (referral_code) {
      try {
        const referrer: any = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referral_code);
        if (!referrer) return res.status(400).json({ success: false, error: 'Invalid referral code' });
        if (referrer.id === userId) return res.status(400).json({ success: false, error: 'You cannot refer yourself' });

        const couponCode = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const couponId = uuidv4();
        db.prepare(`INSERT INTO coupons (id, code, type, value, description, created_by, max_uses) VALUES (?, ?, 'referral', 0.5, ?, ?, 1)`)
          .run(couponId, couponCode, 'Referral welcome discount', referrer.id);

        db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.id, userId);

        const referralId = uuidv4();
        db.prepare(`INSERT INTO referrals (id, referrer_id, referred_id, coupon_id, status) VALUES (?, ?, ?, ?, 'pending')`)
          .run(referralId, referrer.id, userId, couponId);

        const referrerNotificationId = uuidv4();
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'referral', '👥 New Referral!', 'Someone joined LastMart using your referral link!', ?)`)
          .run(referrerNotificationId, referrer.id, JSON.stringify({ referred_user_id: userId }));

        const newUserNotificationId = uuidv4();
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'coupon', '🎉 Welcome Referral Discount!', ?, ?)`)
          .run(newUserNotificationId, userId, `Use code "${couponCode}" for 0.5% off your next order!`, JSON.stringify({ coupon_code: couponCode, coupon_id: couponId }));
      } catch (refErr: any) {
        console.warn('Referral processing error (non-fatal):', refErr.message);
      }
    }

    user = getUserById(db, userId);
    const mappedUser = mapUserRow(user);
    const { password: _, ...userWithoutPassword } = mappedUser;

    const authtoken = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    res.cookie('auth_token', authtoken, {
      httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ success: true, data: { user: userWithoutPassword, authtoken }, message: 'Registration successful' });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  return res.json({ success: true, message: 'Logout successful' });
});

// POST /api/auth/verify-user
router.post('/verify-user', async (req: Request, res: Response) => {
  const userPayload = getUserFromRequest(req);
  if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();
  const { token } = req.body;
  const today = new Date();

  const user = getUserById(db, userPayload.userId);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });
  if (user.is_verified) return res.status(401).json({ success: false, error: 'User already verified' });

  if (token != user.verification_token || (user.verification_expires_at && today > new Date(user.verification_expires_at))) {
    return res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }

  db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL, verification_expires_at = NULL WHERE id = ?')
    .run(userPayload.userId);

  return res.status(200).json({ success: true, message: 'User verified successfully' });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  const userPayload = getUserFromRequest(req);
  if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const db = getDB();
  const user = getUserById(db, userPayload.userId);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });
  if (user.is_verified) return res.status(400).json({ success: false, error: 'User already verified' });

  const { token, expiresIn } = generateVerificationCode();

  await sendEmail({
    to: user.email,
    subject: EmailTemplates.verification(user.name, token).subject,
    html: EmailTemplates.verification(user.name, token).html,
  });

  db.prepare('UPDATE users SET verification_token = ?, verification_expires_at = ? WHERE id = ?')
    .run(token, expiresIn.toISOString(), userPayload.userId);

  return res.status(200).json({ success: true, message: 'Verification code resent' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = getUserByEmail(db, email);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const token: number = Math.floor(100000 + Math.random() * 900000);
    const tokenExpiresIn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET verification_token = ?, verification_expires_at = ? WHERE id = ?')
      .run(token, tokenExpiresIn, user.id);

    return res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (error: any) {
    console.error('Error in forgot password:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
