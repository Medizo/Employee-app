import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const users = await readData('users');
  const idx = users.findIndex(u => u.id === session.id);
  if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  switch (body.type) {
    case 'profile':
      if (body.name) users[idx].name = body.name;
      if (body.phone) users[idx].phone = body.phone;
      break;
    case 'password':
      users[idx].password = body.newPassword; // In production: hash with bcrypt
      break;
    case 'notifications':
      users[idx].notifications = body.notifications;
      break;
    case 'theme':
      users[idx].theme = body.theme;
      break;
  }

  await writeData('users', users);
  return NextResponse.json({ success: true });
}
