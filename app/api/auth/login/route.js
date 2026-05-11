import { NextResponse } from 'next/server';
import { readData, getDb } from '@/lib/db';
import { createToken, setSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const users = await readData('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
    });
    await setSession(token);

    // Auto clock-in: start time tracking session
    try {
      const db = await getDb();
      const col = db.collection('timesessions');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

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

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, department: user.department, role: user.role, avatar: user.avatar, theme: user.theme }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

