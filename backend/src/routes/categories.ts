import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { seedDatabase } from '../lib/seed';

const router = Router();

// GET /api/categories
router.get('/', async (req: Request, res: Response) => {
  try {
    await seedDatabase();
    const db = getDB();
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
