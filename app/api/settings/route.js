import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData, getDb } from '@/lib/db';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';
import bcrypt from 'bcryptjs';

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  let rawPicture = undefined; // preserve full base64 before sanitization
  try {
    const raw = await req.json();
    // Extract picture before sanitization — base64 strings are huge and sanitizeInput truncates to 10KB
    if (raw.type === 'profilePicture' && raw.picture) {
      rawPicture = raw.picture;
    }
    body = sanitizeInput(raw);
    if (rawPicture !== undefined) body.picture = rawPicture; // restore full picture
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
    case 'profilePicture': {
      if (!body.picture) {
        // Remove profile picture
        delete users[idx].profilePicture;
        break;
      }
      // Validate it's a data URL
      if (!body.picture.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }
      // Extract base64 portion and check size (300KB hard limit)
      const base64Part = body.picture.split(',')[1] || '';
      const sizeInBytes = Math.ceil(base64Part.length * 3 / 4);
      if (sizeInBytes > 300 * 1024) {
        return NextResponse.json({ error: 'Image exceeds 300KB limit' }, { status: 400 });
      }
      users[idx].profilePicture = body.picture;
      break;
    }
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
      if (body.theme && ['light', 'dark', 'system', 'high-contrast', 'high-contrast-light'].includes(body.theme)) {
        users[idx].theme = body.theme;
        const db = await getDb();
        await db.collection('user_settings').updateOne(
          { userId: session.id },
          { $set: { themeMode: body.theme, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
      break;
    case 'themeColor':
      if (body.themeColor && ['beige', 'seafoam', 'rose'].includes(body.themeColor)) {
        users[idx].themeColor = body.themeColor;
        const db = await getDb();
        await db.collection('user_settings').updateOne(
          { userId: session.id },
          { $set: { themeColor: body.themeColor, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
      break;
  }

  await writeData('users', users);
  return NextResponse.json({ success: true });
}
