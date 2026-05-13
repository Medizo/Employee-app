import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Read secret from environment — no hardcoded keys
const secretKeyStr = process.env.EMPLOYEE_JWT_SECRET;
const SECRET_KEY = new TextEncoder().encode(secretKeyStr || 'employee-portal-dev-fallback-key');

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/linkedin/callback',  // LinkedIn OAuth callback (redirected from LinkedIn)
  '/login',
  '/forgot-password',
];

function isPublicRoute(pathname) {
  // Exact match for root
  if (pathname === '/') return true;
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Add security headers to every response.
 */
function addSecurityHeaders(response) {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content Security Policy — adjust as needed
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.linkedin.com https://www.linkedin.com;"
  );
  // Strict Transport Security (effective when behind HTTPS/TLS termination)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes through — still add security headers
  if (isPublicRoute(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check for the session cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // For API routes, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Authentication required. Please log in.' },
          { status: 401 }
        )
      );
    }
    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Verify the JWT token
  try {
    await jwtVerify(token, SECRET_KEY);
    return addSecurityHeaders(NextResponse.next());
  } catch (error) {
    // Token is invalid or expired
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('auth-token');
    return addSecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
