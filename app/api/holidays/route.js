import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Fetch holidays for the employee calendar
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const holidays = await db.collection('holidays').find({}).sort({ date: 1 }).toArray();

  // Birthday leave: check if user has a DOB
  let birthdayLeave = null;
  const users = await db.collection('users').find({ id: session.id }).toArray();
  const user = users[0];
  if (user?.dob) {
    // DOB can be YYYY-MM-DD or MM-DD format
    const dobParts = user.dob.split('-');
    let dobMonth, dobDay;
    if (dobParts.length === 3) {
      dobMonth = parseInt(dobParts[1], 10);
      dobDay = parseInt(dobParts[2], 10);
    } else if (dobParts.length === 2) {
      dobMonth = parseInt(dobParts[0], 10);
      dobDay = parseInt(dobParts[1], 10);
    }
    if (dobMonth && dobDay) {
      birthdayLeave = { month: dobMonth, day: dobDay, name: user.name || 'Employee' };
    }
  }

  return NextResponse.json({
    holidays: holidays.map(({ _id, ...rest }) => rest),
    birthdayLeave,
  });
}
