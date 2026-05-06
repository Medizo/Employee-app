import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';
import { createToken, setSession } from '@/lib/auth';

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
    // For demo: accept "password123" as plain text match, or any password for easy testing
    const isValid = password === 'password123' || password === user.password;
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
    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, department: user.department, role: user.role, avatar: user.avatar, theme: user.theme }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
