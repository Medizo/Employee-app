import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * GET /api/emails/unread
 * Returns unread reply count for the notification badge.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 });

  try {
    const db = await getDb();
    const count = await db.collection('email_replies').countDocuments({
      userId: session.id,
      isRead: false,
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
