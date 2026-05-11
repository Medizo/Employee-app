import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString, isValidEmail } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

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

  const newLead = {
    id: uuid(), userId: session.id,
    companyName: sanitizeString(body.companyName, 200),
    contactPerson: sanitizeString(body.contactPerson, 100),
    phone: sanitizeString(body.phone || '', 20),
    email: sanitizeString(body.email || '', 254),
    address: sanitizeString(body.address || '', 500),
    servicesInterested: Array.isArray(body.servicesInterested) ? body.servicesInterested.map(s => sanitizeString(s, 100)) : [],
    source: sanitizeString(body.source || '', 100),
    notes: sanitizeString(body.notes || '', 2000),
    priority: ['Low', 'Medium', 'High', 'Critical'].includes(body.priority) ? body.priority : 'Medium',
    status: 'New',
    activities: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  leads.push(newLead);
  await writeData('leads', leads);
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
  const allowedFields = ['companyName', 'contactPerson', 'phone', 'email', 'address', 'servicesInterested', 'source', 'notes', 'priority', 'status', 'dealValue'];
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
  const leads = await readData('leads');
  const filtered = leads.filter(l => !(l.id === id && l.userId === session.id));
  if (filtered.length === leads.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await writeData('leads', filtered);
  return NextResponse.json({ success: true });
}
