import { Router, Request, Response } from 'express';
import getDB from '../lib/db';
import { getUserFromRequest } from '../lib/auth';

const router = Router();

// GET /api/notifications
router.get('/', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userPayload.userId) as any[];
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userPayload.userId) as any;

    return res.json({
      success: true,
      data: notifications.map(n => ({ ...n, data: JSON.parse(n.data || '{}') })),
      unread_count: unreadCount.count
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications
router.put('/', (req: Request, res: Response) => {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const db = getDB();
    const { notification_id, mark_all } = req.body;

    if (mark_all) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userPayload.userId);
    } else if (notification_id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notification_id, userPayload.userId);
    }

    return res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
