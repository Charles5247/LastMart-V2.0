import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDB, { SavedVendors, Users, Vendors } from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/users/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await Users.findById(userPayload.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let vendorInfo = null;
    if (user.role === 'vendor') {
      vendorInfo = await Vendors.find({ user_id: user._id });
    }

    return res.json({ success: true, data: { user, vendor: vendorInfo }, message: 'Profile fetched' });
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

    const user = await Users.findByIdAndUpdate(userPayload.userId, {
      name,
      phone, 
      address,
      city,
      latitude,
      longitude,
    });


    const updatedUser = await Users.findById(userPayload.userId);

    return res.json({ success: true, data: updatedUser, message: 'Profile updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/saved-vendors
router.get('/saved-vendors', async(req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const savedVendors = await SavedVendors.findOne({ user_id: userPayload.userId }).populate('vendor_id');
    const saved = await SavedVendors.find({user_id: userPayload.userId}).populate("vendor_id").sort({ created_at: -1 });
    

    return res.json({ success: true, data: savedVendors, message: 'Saved vendors fetched'});
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

    // const existing = db.prepare('SELECT id FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').get(userPayload.userId, vendor_id);
    const existing = await SavedVendors.findOne({ user_id: userPayload.userId, vendor_id });
    if (existing) return res.status(400).json({ success: false, error: 'Already saved' });

    // db.prepare('INSERT INTO saved_vendors (id, user_id, vendor_id) VALUES (?, ?, ?)').run(uuidv4(), userPayload.userId, vendor_id);
    const savedVendor = new SavedVendors({
      user_id: userPayload.userId,
      vendor_id,
    })

    await savedVendor.save();

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

    // db.prepare('DELETE FROM saved_vendors WHERE user_id = ? AND vendor_id = ?').run(userPayload.userId, vendorId);

    await SavedVendors.findOneAndDelete({ user_id: userPayload.userId, vendor_id: vendorId });

    return res.json({ success: true, message: 'Vendor unsaved' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
