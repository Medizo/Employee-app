import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * GET /api/linkedin/status
 * Returns whether LinkedIn is connected (has a valid access token).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const token = await db.collection('linkedin_tokens').findOne({ type: 'oauth_token' });

  if (!token || !token.accessToken) {
    return NextResponse.json({ connected: false });
  }

  // Check if token is expired
  const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();

  return NextResponse.json({
    connected: !isExpired,
    expired: isExpired,
    linkedinName: token.linkedinName || null,
    personUrn: token.personUrn || null,
    expiresAt: token.expiresAt || null,
  });
}
