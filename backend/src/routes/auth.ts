import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB from '../lib/db';
import { signToken } from '../lib/auth';
import { seedDatabase } from '../lib/seed';

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
    const { name, email, password, role, city, phone, address, latitude, longitude, store_name, store_description, category } = req.body;

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

export default router;
