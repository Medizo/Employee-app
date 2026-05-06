import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ proofs: await readData('proofs').filter(p => p.userId === session.id) });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const proofs = await readData('proofs');
  const newProof = { id: uuid(), userId: session.id, ...body, attachments: [], reviewStatus: 'Pending', submittedAt: new Date().toISOString() };
  proofs.push(newProof);
  await writeData('proofs', proofs);
  return NextResponse.json({ proof: newProof });
}
