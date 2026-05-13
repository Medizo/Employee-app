import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString, isOneOf } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

// GET: Fetch current user's leaves
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const leaves = await db.collection('leaves').find({ userId: session.id }).toArray();
  
  // Calculate comp-off balance: earned from weekend work (8+ hrs) minus used comp-offs
  const attendance = await db.collection('attendance').find({ userId: session.id }).toArray();
  const weekendWork = attendance.filter(a => {
    if (!a.date || !a.totalHours || a.totalHours < 8) return false;
    const d = new Date(a.date + 'T00:00:00');
    const dow = d.getDay();
    return dow === 0 || dow === 6; // Sunday or Saturday
  });
  const compOffsEarned = weekendWork.length;
  const compOffsUsed = leaves.filter(l => l.leaveType === 'Comp Off' && l.status !== 'Rejected').length;
  const compOffBalance = compOffsEarned - compOffsUsed;

  return NextResponse.json({
    leaves: leaves.map(({ _id, ...rest }) => rest),
    compOffBalance,
    compOffsEarned,
    compOffsUsed,
    weekendWorkDates: weekendWork.map(w => w.date),
  });
}

// POST: Apply for a new leave
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const date = sanitizeString(body.date, 10);
  const leaveType = sanitizeString(body.leaveType, 50);
  const reason = sanitizeString(body.reason, 1000);

  if (!isNonEmptyString(date) || !isNonEmptyString(leaveType) || !isNonEmptyString(reason)) {
    return NextResponse.json({ error: 'Date, leave type, and reason are required' }, { status: 400 });
  }

  // Validate leave type
  if (!isOneOf(leaveType, ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Comp Off', 'Birthday Leave', 'LOP'])) {
    return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 });
  }

  // If using comp-off, check balance
  if (leaveType === 'Comp Off') {
    const db = await getDb();
    const attendance = await db.collection('attendance').find({ userId: session.id }).toArray();
    const leaves = await db.collection('leaves').find({ userId: session.id }).toArray();
    const weekendWork = attendance.filter(a => {
      if (!a.date || !a.totalHours || a.totalHours < 8) return false;
      const d = new Date(a.date + 'T00:00:00');
      const dow = d.getDay();
      return dow === 0 || dow === 6;
    });
    const used = leaves.filter(l => l.leaveType === 'Comp Off' && l.status !== 'Rejected').length;
    if (used >= weekendWork.length) {
      return NextResponse.json({ error: 'No comp-off balance available' }, { status: 400 });
    }
  }

  const db = await getDb();
  const newLeave = {
    id: uuid(),
    userId: session.id,
    userName: session.name || 'Unknown',
    userDepartment: session.department || 'Unknown',
    date,
    leaveType,
    reason,
    status: 'Pending', // Pending → Approved / Rejected by admin
    appliedAt: new Date().toISOString(),
    reviewedAt: null,
    adminComments: '',
  };

  await db.collection('leaves').insertOne(newLeave);
  const { _id, ...clean } = newLeave;
  return NextResponse.json({ leave: clean });
}
