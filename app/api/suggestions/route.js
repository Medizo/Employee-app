import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ suggestions: (await readData('suggestions')).filter(s => s.userId === session.id) });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const sug = await readData('suggestions');
  const newSug = { id: uuid(), userId: session.id, ...body, attachments: [], status: 'Pending', adminReply: '', submittedAt: new Date().toISOString() };
  sug.push(newSug);
  await writeData('suggestions', sug);
  return NextResponse.json({ suggestion: newSug });
}
