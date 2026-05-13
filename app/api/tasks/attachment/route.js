import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/tasks/attachment?taskId=xxx
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

  const db = await getDb();
  const attachment = await db.collection('task_attachments').findOne({ taskId });

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found or expired (attachments are deleted after 25 days)' }, { status: 404 });
  }

  return NextResponse.json({
    filename: attachment.filename,
    contentType: attachment.contentType,
    base64Data: attachment.base64Data,
    sizeBytes: attachment.sizeBytes,
    expired: false,
  });
}
