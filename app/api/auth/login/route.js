import { NextResponse } from 'next/server';
import { readData, getDb } from '@/lib/db';
import { createToken, setSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeString, isValidEmail } from '@/lib/sanitize';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    // Rate limiting — 10 login attempts per 15-minute window per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { limited } = checkRateLimit(`login:${ip}`, 10);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email = sanitizeString(body.email, 254);
    const password = sanitizeString(body.password, 128);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const users = await readData('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.deactivated) {
      return NextResponse.json({ error: 'Your account has been deactivated. Please contact support.' }, { status: 403 });
    }

    // Support both plain-text passwords (seed data) and bcrypt-hashed passwords (admin-created)
    let isValid = false;
    if (user.password && user.password.startsWith('$2')) {
      // bcrypt hash
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // plain text match
      isValid = password === user.password;
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const token = await createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      collegeId: user.collegeId || null,
    });
    await setSession(token);

    // Auto clock-in: start time tracking session
    try {
      const db = await getDb();
      const col = db.collection('timesessions');
      const now = new Date();
      const IST_OFFSET = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + IST_OFFSET);
      const todayStr = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, '0')}-${String(istNow.getUTCDate()).padStart(2, '0')}`;

      // Check if already clocked in today
      const existing = await col.findOne({
        userId: user.id,
        date: todayStr,
        logoutTime: null,
      });

      if (!existing) {
        await col.insertOne({
          userId: user.id,
          date: todayStr,
          loginTime: now.toISOString(),
          logoutTime: null,
          totalSeconds: 0,
          lastHeartbeat: now.toISOString(),
        });
      }
    } catch (clockErr) {
      console.error('Auto clock-in error (non-fatal):', clockErr);
    }

    try {
      const db = await getDb();
      const settings = await db.collection('user_settings').findOne({ userId: user.id });
      if (settings?.themeMode) user.theme = settings.themeMode;
      if (settings?.themeColor) user.themeColor = settings.themeColor;
    } catch (err) {
      console.error('Failed to load user settings from Mongo:', err);
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, department: user.department, role: user.role, avatar: user.avatar, theme: user.theme, themeColor: user.themeColor }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
