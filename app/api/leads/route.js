import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString, isValidEmail } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';
import { notifyAdmins } from '@/lib/admin-notify';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const leads = (await readData('leads')).filter(l => l.userId === session.id);
  return NextResponse.json({ leads });
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
  if (!isNonEmptyString(body.companyName)) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.contactPerson)) {
    return NextResponse.json({ error: 'Contact person is required' }, { status: 400 });
  }

  const leads = await readData('leads');
  // duplicate check
  const dup = leads.find(l => l.userId === session.id && (l.email === body.email || l.phone === body.phone));
  if (dup) return NextResponse.json({ error: 'A lead with this email or phone already exists' }, { status: 400 });

  const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed', 'Lost'];
  const newLead = {
    id: uuid(), userId: session.id,
    companyName: sanitizeString(body.companyName, 200),
    contactPerson: sanitizeString(body.contactPerson, 100),
    designation: sanitizeString(body.designation || '', 100),
    phone: sanitizeString(body.phone || '', 20),
    email: sanitizeString(body.email || '', 254),
    address: sanitizeString(body.address || '', 500),
    industry: sanitizeString(body.industry || '', 100),
    companySize: sanitizeString(body.companySize || '', 20),
    servicesInterested: Array.isArray(body.servicesInterested) ? body.servicesInterested.map(s => sanitizeString(s, 100)) : [],
    source: sanitizeString(body.source || '', 100),
    estMonthlyVolume: sanitizeString(body.estMonthlyVolume || '', 50),
    estDealValue: sanitizeString(body.estDealValue || '', 50),
    notes: sanitizeString(body.notes || '', 2000),
    priority: ['Low', 'Medium', 'High', 'Critical'].includes(body.priority) ? body.priority : 'Medium',
    status: validStatuses.includes(body.status) ? body.status : 'New',
    nextFollowupDate: sanitizeString(body.nextFollowupDate || '', 20),
    activities: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  leads.push(newLead);
  await writeData('leads', leads);

  await notifyAdmins({
    type: 'success',
    title: '🎯 New Lead Added',
    message: `${session.name || 'An employee'} added lead: ${newLead.companyName} (${newLead.contactPerson})`,
    link: `/dashboard/leads?expand=${newLead.id}`,
  });

  return NextResponse.json({ lead: newLead });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const leads = await readData('leads');
  const idx = leads.findIndex(l => l.id === body.id && l.userId === session.id);
  if (idx === -1) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Only allow updating specific fields — prevent overwriting userId, id, etc.
  const allowedFields = ['companyName', 'contactPerson', 'designation', 'phone', 'email', 'address', 'industry', 'companySize', 'servicesInterested', 'source', 'estMonthlyVolume', 'estDealValue', 'notes', 'priority', 'status', 'dealValue', 'nextFollowupDate'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      leads[idx][field] = typeof body[field] === 'string' ? sanitizeString(body[field], 2000) : body[field];
    }
  }
  leads[idx].updatedAt = new Date().toISOString();

  await writeData('leads', leads);
  return NextResponse.json({ lead: leads[idx] });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);
  const reason = sanitizeString(searchParams.get('reason') || 'No reason provided', 500);

  const leads = await readData('leads');
  const lead = leads.find(l => l.id === id && l.userId === session.id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Don't actually delete — create a deletion request for admin approval
  const { getDb } = await import('@/lib/db');
  const db = await getDb();

  // Check if there's already a pending request for this lead
  const existing = await db.collection('lead_deletion_requests').findOne({ leadId: id, status: 'pending' });
  if (existing) {
    return NextResponse.json({ error: 'A deletion request is already pending for this lead', pending: true }, { status: 409 });
  }

  const request = {
    id: uuid(),
    leadId: id,
    leadCompanyName: lead.companyName,
    leadContactPerson: lead.contactPerson,
    leadEmail: lead.email,
    requestedByUserId: session.id,
    requestedByName: session.name || session.email,
    reason,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  await db.collection('lead_deletion_requests').insertOne(request);

  await notifyAdmins({
    type: 'warning',
    title: '⚠️ Lead Deletion Requested',
    message: `${session.name || 'An employee'} requested deletion of lead: ${lead.companyName} (${lead.contactPerson})`,
    link: `/dashboard/leads?expand=${lead.id}`,
  });

  // Mark the lead as having a pending deletion request
  const idx = leads.findIndex(l => l.id === id);
  if (idx !== -1) {
    leads[idx].deletionRequested = true;
    leads[idx].deletionRequestId = request.id;
    leads[idx].updatedAt = new Date().toISOString();
    leads[idx].activities = leads[idx].activities || [];
    leads[idx].activities.push({
      id: Date.now().toString(),
      type: 'Status Change',
      description: `Deletion requested by ${session.name || session.email}. Reason: ${reason}. Awaiting admin approval.`,
      timestamp: new Date().toISOString(),
    });
    await writeData('leads', leads);
  }

  return NextResponse.json({ success: true, message: 'Deletion request sent to admin for approval.', requestId: request.id });
}
