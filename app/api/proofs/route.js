import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';
import { notifyAdmins } from '@/lib/admin-notify';

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

  if (!isNonEmptyString(body.title) && (!isNonEmptyString(body.leadId) || !isNonEmptyString(body.activityType))) {
    return NextResponse.json({ error: 'Proof title or lead activity is required' }, { status: 400 });
  }

  const proofs = await readData('proofs');
  const newProof = {
    id: uuid(),
    userId: session.id,
    title: sanitizeString(body.title || `${body.activityType} on ${body.leadName}`, 200),
    description: sanitizeString(body.description || '', 2000),
    taskId: sanitizeString(body.taskId || '', 50),
    leadId: sanitizeString(body.leadId || '', 50),
    leadName: sanitizeString(body.leadName || '', 200),
    activityType: sanitizeString(body.activityType || '', 100),
    attachments: [],
    reviewStatus: 'Pending',
    submittedAt: new Date().toISOString(),
  };
  proofs.push(newProof);
  await writeData('proofs', proofs);

  if (newProof.leadId) {
    const leads = await readData('leads');
    const leadIdx = leads.findIndex(l => l.id === newProof.leadId && l.userId === session.id);
    if (leadIdx !== -1) {
      if (leads[leadIdx].status === 'New') {
        leads[leadIdx].status = 'Contacted';
        leads[leadIdx].updatedAt = new Date().toISOString();
        await writeData('leads', leads);
      }
    }
  }

  await notifyAdmins({
    type: 'info',
    title: '📎 Work Proof Uploaded',
    message: `${session.name || 'An employee'} uploaded proof: "${newProof.title}"`,
    link: '/dashboard/submissions',
  });

  return NextResponse.json({ proof: newProof });
}
