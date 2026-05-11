import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  let subs = (await readData('submissions')).filter(s => s.userId === session.id);
  if (type) subs = subs.filter(s => s.formType === sanitizeString(type, 50));
  if (status) subs = subs.filter(s => s.status === sanitizeString(status, 50));
  return NextResponse.json({ submissions: subs.reverse() });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.formType)) {
    return NextResponse.json({ error: 'Form type is required' }, { status: 400 });
  }

  const subs = await readData('submissions');
  const newSub = {
    id: uuid(),
    userId: session.id,
    formType: sanitizeString(body.formType, 100),
    status: 'Submitted',
    data: sanitizeInput(body.data || {}),
    adminComments: '',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };
  subs.push(newSub);
  await writeData('submissions', subs);
  return NextResponse.json({ submission: newSub });
}
