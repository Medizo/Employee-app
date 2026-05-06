import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const leads = await readData('leads').filter(l => l.userId === session.id);
  return NextResponse.json({ leads });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const leads = await readData('leads');
  // duplicate check
  const dup = leads.find(l => l.userId === session.id && (l.email === body.email || l.phone === body.phone));
  if (dup) return NextResponse.json({ error: 'A lead with this email or phone already exists' }, { status: 400 });
  const newLead = {
    id: uuid(), userId: session.id,
    companyName: body.companyName, contactPerson: body.contactPerson,
    phone: body.phone, email: body.email, address: body.address || '',
    servicesInterested: body.servicesInterested || [],
    source: body.source || '', notes: body.notes || '',
    priority: body.priority || 'Medium', status: 'New',
    activities: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  leads.push(newLead);
  await writeData('leads', leads);
  return NextResponse.json({ lead: newLead });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const leads = await readData('leads');
  const idx = leads.findIndex(l => l.id === body.id && l.userId === session.id);
  if (idx === -1) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  leads[idx] = { ...leads[idx], ...body, updatedAt: new Date().toISOString() };
  await writeData('leads', leads);
  return NextResponse.json({ lead: leads[idx] });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const leads = await readData('leads');
  const filtered = leads.filter(l => !(l.id === id && l.userId === session.id));
  if (filtered.length === leads.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await writeData('leads', filtered);
  return NextResponse.json({ success: true });
}
