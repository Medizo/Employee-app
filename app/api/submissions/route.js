import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  let subs = (await readData('submissions')).filter(s => s.userId === session.id);
  if (type) subs = subs.filter(s => s.formType === type);
  if (status) subs = subs.filter(s => s.status === status);
  return NextResponse.json({ submissions: subs.reverse() });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const subs = await readData('submissions');
  const newSub = { id: uuid(), userId: session.id, formType: body.formType, status: 'Submitted', data: body.data, adminComments: '', submittedAt: new Date().toISOString(), reviewedAt: null };
  subs.push(newSub);
  await writeData('submissions', subs);
  return NextResponse.json({ submission: newSub });
}
