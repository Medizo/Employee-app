import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/**
 * GET /api/linkedin/auth
 * Initiates LinkedIn OAuth 2.0 authorization flow.
 * Redirects user to LinkedIn's consent page.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'LinkedIn credentials not configured' }, { status: 500 });
  }

  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // LinkedIn OAuth 2.0 scopes — w_organization_social lets us post to company pages
  const scopes = ['openid', 'profile', 'w_member_social', 'w_organization_social'].join(' ');

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', scopes);

  return NextResponse.redirect(authUrl.toString());
}
