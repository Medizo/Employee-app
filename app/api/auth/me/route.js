import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const users = await readData('users');
  const user = users.find(u => u.id === session.id);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const { password, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
