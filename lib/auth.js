import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Read secret from environment — fail fast if missing in production
const secretKeyStr = process.env.EMPLOYEE_JWT_SECRET;
if (!secretKeyStr && process.env.NODE_ENV === 'production') {
  throw new Error('EMPLOYEE_JWT_SECRET environment variable is required in production');
}
const SECRET_KEY = new TextEncoder().encode(secretKeyStr || 'employee-portal-dev-fallback-key');

export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function setSession(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}
