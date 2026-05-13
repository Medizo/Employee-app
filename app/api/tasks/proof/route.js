import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/tasks/proof?taskId=xxx
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

  const db = await getDb();
  const proof = await db.collection('task_attachments').findOne({ taskId, type: 'completion_proof' });

  if (!proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
  }

  return NextResponse.json({
    filename: proof.filename,
    contentType: proof.contentType,
    base64Data: proof.base64Data,
    sizeBytes: proof.sizeBytes,
  });
}
