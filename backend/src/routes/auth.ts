import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB, { Coupons, Notifications, Referrals, Users, Vendors } from '../lib/db';
import { getUserFromRequest, signToken } from '../lib/auth';
import { seedNewDatabase } from '../lib/seed';
import { sendEmail, EmailTemplates } from '../lib/email'
import { error } from 'console';

const router = Router();

function generateVerificationCode(): {token: number, expiresIn: Date} {
  const token: number = Math.floor(100000 + Math.random() * 900000);
  const expiresIn: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return {token, expiresIn};
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    await seedNewDatabase();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await Users.findOne({email});
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    if (!user.is_verified) return res.status(401).json({ success: false, error: 'User not verified' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = await Vendors.findOne({user_id: user._id});
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
    await seedNewDatabase();

    const { name, email, password, role, city, phone, address, latitude, longitude, store_name, store_description, category, referral_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    const existing = await Users.findOne({email});
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const userRole = role || 'customer';
    const {token, expiresIn} = generateVerificationCode();

    const user = new Users({
      name,
      email,
      password,
      role: userRole,
      city: city || null,
      phone: phone || null,
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      is_verified: false,
      verification_expires_at: expiresIn,
      verification_token: token,
    })

    await sendEmail({
      to: user.email,
      subject: EmailTemplates.verification(user.name, token).subject,
      html: EmailTemplates.verification(user.name, token).html,
    });

    if (userRole === 'vendor') {
      if (!store_name) return res.status(400).json({ success: false, error: 'Store name is required for vendors' });
      if (!city) return res.status(400).json({ success: false, error: 'City location is required for vendors' });
      
      const vendor = new Vendors({
        user_id: user._id,
        store_name,
        description: store_description || null,
        category: category || null,
        city: city || '',
        latitude: latitude || null,
        longitude: longitude || null,
      })
      await vendor.save();
    }

    await user.save();
    // ── Handle referral code if provided ──────────────────────────────────
    if (referral_code) {
      try {
        const referrer = await Users.findOne({referral_code});
        if (!referrer) return res.status(400).json({ success: false, error: 'Invalid referral code' });
        if(referrer._id === user._id) return res.status(400).json({ success: false, error: 'You cannot refer yourself' });

        const couponCode = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const coupon = new Coupons({
          code: couponCode,
          type: 'referral',
          value: 0.5,
          description: 'Referral welcome discount',
          max_uses: 1,
          created_by: referrer._id,
        })
        await coupon.save();

        user.referred_by = referrer._id;
        await user.save();

        const referral = new Referrals({
          referrer_id: referrer._id,
          referred_id: user._id,
          coupon_id: coupon._id,
          status: 'pending',
        })
        await referral.save();


        const referrerNotification = new Notifications({
          user_id: referrer._id,
          type: 'referral',
          title: '👥 New Referral!',
          message: 'Someone joined LastMart using your referral link!',
          data: JSON.stringify({ referred_user_id: user._id }),
        })

        /* CAN BE USED AFTER USER COMPLETES REGISTRATION */
        const newUserNotification = new Notifications({
          user_id: user._id,
          type: 'coupon',
          title: '🎉 Welcome Referral Discount!',
          message: `Use code "${couponCode}" for 0.5% off your next order!`,
          data: JSON.stringify({ coupon_code: couponCode, coupon_id: coupon._id }),
        })

        await referrerNotification.save();
        await newUserNotification.save();

        
      } catch (refErr: any) {
        console.warn('Referral processing error (non-fatal):', refErr.message);
      }
    }
    
    
    const authtoken = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie('auth_token', token, {
      httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ success: true, data: { user, authtoken }, message: 'Registration successful' });
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

  const { token } = req.body;
  const today = new Date();

  const user = await Users.findById(userPayload.userId);

  if (!user) return res.status(401).json({ success: false, error: 'User not found' });
  if (user.is_verified) return res.status(401).json({ success: false, error: 'User already verified' });

  if (token != user.verification_token || (user.verification_expires_at && today > user.verification_expires_at)) return res.status(400).json({ success: false, erron: 'Invalid or expired token' });

  user.is_verified = true;
  user.verification_token = null;
  user.verification_expires_at = null;

  await user.save();

  return res.status(200).json({ success: true, message:' User verified successfully' });

});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  const userPayload = getUserFromRequest(req);
  if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const user = await Users.findById(userPayload.userId);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });
  if(user.is_verified) return res.status(400).json({ success: false, error: 'User already verified' });

  const { token, expiresIn } = generateVerificationCode();

  await sendEmail({
    to: user.email,
    subject: EmailTemplates.verification(user.name, token).subject,
    html: EmailTemplates.verification(user.name, token).html,
  });

  user.verification_token = token;
  user.verification_expires_at = expiresIn;

  await user.save();

  return res.status(200).json({ success: true, message: 'Verification code resent' });

})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await Users.findOne({email});
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    //Add fields to your user db to accomodate code storage

    const token: Number = Math.floor(100000 + Math.random() * 900000);
    const tokenExpiresIn = Date.now() + 60 * 60 * 1000; // 1 hour

    return res.status(200).json({ success: true, message: 'OTP sent to your email' });

  }catch(error: any){
    console.error('Error in forgot password:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
