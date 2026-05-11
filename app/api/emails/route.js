import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const emails = (await readData('emails')).filter(e => e.userId === session.id);
  return NextResponse.json({ emails });
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

  if (!isNonEmptyString(body.to)) {
    return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.subject)) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }

  const emails = await readData('emails');
  const newEmail = {
    id: uuid(),
    userId: session.id,
    to: sanitizeString(body.to, 254),
    subject: sanitizeString(body.subject, 200),
    body: sanitizeString(body.body || '', 10000),
    status: 'Sent',
    sentAt: new Date().toISOString(),
  };
  emails.push(newEmail);
  await writeData('emails', emails);
  return NextResponse.json({ email: newEmail });
}
