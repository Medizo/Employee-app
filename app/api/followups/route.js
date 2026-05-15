import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId');

  const followups = (await readData('followups')).filter(f => {
    if (f.userId !== session.id) return false;
    if (leadId) return f.leadId === leadId;
    return true;
  });

  // Sort newest first
  followups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json({ followups });
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

  // Validate required fields
  if (!isNonEmptyString(body.leadId)) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.date)) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.mode)) {
    return NextResponse.json({ error: 'Mode of follow-up is required' }, { status: 400 });
  }

  const validModes = ['Phone Call', 'Email', 'Video Call', 'In-Person Meeting', 'WhatsApp', 'LinkedIn', 'Other'];
  if (!validModes.includes(body.mode)) {
    return NextResponse.json({ error: 'Invalid follow-up mode' }, { status: 400 });
  }

  const validStatuses = [
    'Interested — Moving Forward',
    'Requested More Info',
    'Follow-up Scheduled',
    'Not Interested',
    'No Response',
    'Deal Closed',
    'On Hold',
    'Referred to Decision Maker',
  ];

  const followups = await readData('followups');

  const newFollowup = {
    id: uuid(),
    userId: session.id,
    leadId: sanitizeString(body.leadId, 50),
    date: sanitizeString(body.date, 20),
    clientName: sanitizeString(body.clientName || '', 200),
    contactPerson: sanitizeString(body.contactPerson || '', 100),
    mode: body.mode,
    discussionSummary: sanitizeString(body.discussionSummary || '', 5000),
    clientResponse: validStatuses.includes(body.clientResponse) ? body.clientResponse : 'No Response',
    nextAction: sanitizeString(body.nextAction || '', 2000),
    nextFollowupDate: sanitizeString(body.nextFollowupDate || '', 20),
    createdAt: new Date().toISOString(),
  };

  followups.push(newFollowup);
  await writeData('followups', followups);

  // Also add an activity entry on the lead
  const leads = await readData('leads');
  const leadIdx = leads.findIndex(l => l.id === body.leadId && l.userId === session.id);
  if (leadIdx !== -1) {
    if (!leads[leadIdx].activities) leads[leadIdx].activities = [];
    leads[leadIdx].activities.push({
      id: uuid(),
      type: 'Followup',
      description: `${body.mode} follow-up — ${body.clientResponse || 'No Response'}${body.discussionSummary ? '. ' + body.discussionSummary.substring(0, 120) : ''}`,
      timestamp: body.date || new Date().toISOString(),
    });

    // Update lead status based on response if applicable
    if (body.clientResponse === 'Deal Closed') {
      leads[leadIdx].status = 'Closed';
    } else if (body.clientResponse === 'Not Interested') {
      leads[leadIdx].status = 'Lost';
    } else if (leads[leadIdx].status === 'New') {
      leads[leadIdx].status = 'Contacted';
    }

    leads[leadIdx].updatedAt = new Date().toISOString();
    await writeData('leads', leads);
  }

  return NextResponse.json({ followup: newFollowup });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);

  const followups = await readData('followups');
  const filtered = followups.filter(f => !(f.id === id && f.userId === session.id));
  if (filtered.length === followups.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await writeData('followups', filtered);
  return NextResponse.json({ success: true });
}
