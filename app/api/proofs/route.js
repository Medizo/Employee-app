import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ proofs: (await readData('proofs')).filter(p => p.userId === session.id) });
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
    return NextResponse.json({ error: 'Proof title is required' }, { status: 400 });
  }

  const proofs = await readData('proofs');
  const newProof = {
    id: uuid(),
    userId: session.id,
    title: sanitizeString(body.title, 200),
    description: sanitizeString(body.description || '', 2000),
    taskId: sanitizeString(body.taskId || '', 50),
    attachments: [],
    reviewStatus: 'Pending',
    submittedAt: new Date().toISOString(),
  };
  proofs.push(newProof);
  await writeData('proofs', proofs);
  return NextResponse.json({ proof: newProof });
}
