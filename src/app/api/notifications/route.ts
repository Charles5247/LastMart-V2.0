import { NextRequest, NextResponse } from 'next/server';
import getDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userPayload.userId) as any[];
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userPayload.userId) as any;

    return NextResponse.json({
      success: true,
      data: notifications.map(n => ({ ...n, data: JSON.parse(n.data || '{}') })),
      unread_count: unreadCount.count
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const db = getDB();
    const { notification_id, mark_all } = await request.json();

    if (mark_all) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userPayload.userId);
    } else if (notification_id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notification_id, userPayload.userId);
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
