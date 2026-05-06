import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const emails = await readData('emails').filter(e => e.userId === session.id);
  return NextResponse.json({ emails });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const emails = await readData('emails');
  const newEmail = { id: uuid(), userId: session.id, ...body, status: 'Sent', sentAt: new Date().toISOString() };
  emails.push(newEmail);
  await writeData('emails', emails);
  return NextResponse.json({ email: newEmail });
}
