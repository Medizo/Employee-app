import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ attendance: await readData('attendance').filter(a => a.userId === session.id) });
}
