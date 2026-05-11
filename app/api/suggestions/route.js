import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ suggestions: (await readData('suggestions')).filter(s => s.userId === session.id) });
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

  if (!isNonEmptyString(body.title)) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const sug = await readData('suggestions');
  const newSug = {
    id: uuid(),
    userId: session.id,
    title: sanitizeString(body.title, 200),
    category: sanitizeString(body.category || '', 100),
    description: sanitizeString(body.description || '', 5000),
    attachments: [],
    status: 'Pending',
    adminReply: '',
    submittedAt: new Date().toISOString(),
  };
  sug.push(newSug);
  await writeData('suggestions', sug);
  return NextResponse.json({ suggestion: newSug });
}
