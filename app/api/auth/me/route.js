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
  
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    const settings = await db.collection('user_settings').findOne({ userId: session.id });
    if (settings?.themeMode) safeUser.theme = settings.themeMode;
    if (settings?.themeColor) safeUser.themeColor = settings.themeColor;
  } catch (err) {
    console.error('Failed to load user settings from Mongo:', err);
  }

  return NextResponse.json({ user: safeUser });
}
