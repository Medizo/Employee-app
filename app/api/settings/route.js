import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';
import bcrypt from 'bcryptjs';

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const users = await readData('users');
  const idx = users.findIndex(u => u.id === session.id);
  if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  switch (body.type) {
    case 'profile':
      if (body.name) users[idx].name = sanitizeString(body.name, 100);
      if (body.phone) users[idx].phone = sanitizeString(body.phone, 20);
      break;
    case 'password':
      if (!body.newPassword || body.newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      // Hash password before storing — never store plaintext
      users[idx].password = await bcrypt.hash(sanitizeString(body.newPassword, 128), 10);
      break;
    case 'notifications':
      users[idx].notifications = body.notifications;
      break;
    case 'theme':
      if (body.theme && ['light', 'dark', 'system'].includes(body.theme)) {
        users[idx].theme = body.theme;
      }
      break;
  }

  await writeData('users', users);
  return NextResponse.json({ success: true });
}
