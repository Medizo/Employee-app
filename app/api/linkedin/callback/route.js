import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * GET /api/linkedin/callback
 * Handles LinkedIn OAuth callback — exchanges authorization code for access token.
 * Stores the token in the `linkedin_tokens` collection (NOT per-user, shared by org).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    // Redirect to content studio with error
    return NextResponse.redirect(
      `http://localhost:3000/dashboard/content-studio?linkedin_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `http://localhost:3000/dashboard/content-studio?linkedin_error=${encodeURIComponent('No authorization code received')}`
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // seconds

    // Fetch the LinkedIn user's profile to get their person URN
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    let personUrn = null;
    let linkedinName = null;
    if (profileRes.ok) {
      const profile = await profileRes.json();
      personUrn = `urn:li:person:${profile.sub}`;
      linkedinName = profile.name || profile.given_name || 'LinkedIn User';
    }

    // Store token in DB (upsert — one active token per app)
    const db = await getDb();
    const orgId = process.env.LINKEDIN_ORG_ID;
    await db.collection('linkedin_tokens').updateOne(
      { type: 'oauth_token' },
      {
        $set: {
          type: 'oauth_token',
          accessToken,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          personUrn,
          linkedinName,
          orgUrn: orgId ? `urn:li:organization:${orgId}` : null,
          orgId: orgId || null,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    // Redirect back to content studio with success
    return NextResponse.redirect(
      `http://localhost:3000/dashboard/content-studio?linkedin_connected=true&name=${encodeURIComponent(linkedinName || '')}`
    );
  } catch (err) {
    console.error('LinkedIn OAuth error:', err);
    return NextResponse.redirect(
      `http://localhost:3000/dashboard/content-studio?linkedin_error=${encodeURIComponent(err.message)}`
    );
  }
}
