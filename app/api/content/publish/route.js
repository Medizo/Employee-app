import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, readData } from '@/lib/db';

/**
 * POST /api/content/publish
 * Publishes a content post to the Cluso InfoLink LinkedIn Company Page.
 * Images are uploaded directly to LinkedIn's servers — NOT stored in MongoDB.
 * 
 * Strategy:
 * 1. Try posting as the organization (company page) using the UGC API
 * 2. If org posting fails (missing w_organization_social), fall back to personal profile
 * 
 * Body: { postId, platforms: ["linkedin"], imageBase64?: string }
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const users = await readData('users');
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { postId, platforms = ['linkedin'], imageBase64 } = body;

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  // Find the post
  const post = await db.collection('content_posts').findOne({ id: postId });
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const results = { linkedin: null, twitter: null };
  const errors = [];

  // ── LinkedIn Publishing ──
  if (platforms.includes('linkedin')) {
    try {
      const linkedinResult = await publishToLinkedIn(db, post, imageBase64);
      results.linkedin = { 
        posted: true, 
        postId: linkedinResult.id, 
        postedAs: linkedinResult.postedAs,
        postedAt: new Date().toISOString() 
      };
    } catch (err) {
      console.error('LinkedIn publish error:', err);
      results.linkedin = { posted: false, error: err.message, postedAt: null };
      errors.push(`LinkedIn: ${err.message}`);
    }
  }

  // ── Twitter/X Publishing (placeholder — no keys configured yet) ──
  if (platforms.includes('twitter')) {
    results.twitter = { posted: false, error: 'Twitter API not configured yet', postedAt: null };
    errors.push('Twitter: API not configured yet');
  }

  // Determine overall status
  const activePlatforms = platforms.filter(p => results[p]);
  const allPosted = activePlatforms.every(p => results[p]?.posted);
  const anyPosted = activePlatforms.some(p => results[p]?.posted);
  const status = allPosted ? 'published' : anyPosted ? 'partial' : 'failed';

  // Update post in DB (text only — no image stored)
  await db.collection('content_posts').updateOne(
    { id: postId },
    {
      $set: {
        status,
        publishedTo: results,
        publishedAt: new Date().toISOString(),
        publishedBy: currentUser.id,
        publishedByName: currentUser.name,
      },
    }
  );

  return NextResponse.json({
    success: errors.length === 0,
    status,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ── LinkedIn Publishing — Tries org page first, falls back to personal ──
async function publishToLinkedIn(db, post, imageBase64) {
  // Get stored OAuth token
  const tokenDoc = await db.collection('linkedin_tokens').findOne({ type: 'oauth_token' });
  
  if (!tokenDoc || !tokenDoc.accessToken) {
    throw new Error('LinkedIn not connected. Please connect your LinkedIn account first via the Content Studio.');
  }

  // Check expiration
  if (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) < new Date()) {
    throw new Error('LinkedIn access token has expired. Please reconnect your LinkedIn account.');
  }

  const accessToken = tokenDoc.accessToken;
  const personUrn = tokenDoc.personUrn;
  const orgId = process.env.LINKEDIN_ORG_ID;
  const orgUrn = orgId ? `urn:li:organization:${orgId}` : null;

  if (!personUrn && !orgUrn) {
    throw new Error('LinkedIn profile not found. Please reconnect your LinkedIn account.');
  }

  const postText = `${post.title}\n\n${post.body}`;

  // ── Strategy: Try org first, then fall back to personal ──
  if (orgUrn) {
    try {
      console.log(`Attempting to post as organization: ${orgUrn}`);
      const result = await postViaUgcApi(accessToken, orgUrn, post, postText, imageBase64);
      result.postedAs = 'organization';
      return result;
    } catch (orgError) {
      console.error('Organization posting failed:', orgError.message);
      console.log('Falling back to personal profile posting...');
      // Fall through to personal profile posting
    }
  }

  // Fall back to personal profile
  if (personUrn) {
    console.log(`Posting as personal profile: ${personUrn}`);
    const result = await postViaUgcApi(accessToken, personUrn, post, postText, imageBase64);
    result.postedAs = 'personal';
    return result;
  }

  throw new Error('No valid LinkedIn identity available for posting.');
}

/**
 * Post via the UGC Posts API (v2) — works for both person and organization authors
 */
async function postViaUgcApi(accessToken, authorUrn, post, postText, imageBase64) {
  let imageUrn = null;

  // Upload image if provided — directly to LinkedIn, NOT stored in MongoDB
  if (imageBase64) {
    imageUrn = await uploadImageToLinkedIn(accessToken, authorUrn, imageBase64);
  }

  const payload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: postText },
        shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
        ...(imageUrn ? {
          media: [{
            status: 'READY',
            media: imageUrn,
            title: { text: post.title },
          }],
        } : {}),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`UGC Posts API error (author: ${authorUrn}):`, errText);
    throw new Error(`LinkedIn post failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return { id: data.id || 'posted' };
}

/**
 * Uploads an image directly to LinkedIn's servers.
 * The image is NOT stored in MongoDB — it only lives on LinkedIn.
 * 
 * Flow:
 * 1. Register an upload with LinkedIn → get uploadUrl + asset URN
 * 2. PUT the binary image data to the uploadUrl
 * 3. Return the asset URN to reference in the post
 */
async function uploadImageToLinkedIn(accessToken, ownerUrn, imageBase64) {
  // Step 1: Register upload (owner can be person or organization)
  const registerPayload = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: ownerUrn,
      serviceRelationships: [{
        relationshipType: 'OWNER',
        identifier: 'urn:li:userGeneratedContent',
      }],
    },
  };

  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registerPayload),
  });

  if (!registerRes.ok) {
    const errText = await registerRes.text();
    throw new Error(`Image register failed (${registerRes.status}): ${errText}`);
  }

  const registerData = await registerRes.json();
  const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const asset = registerData.value?.asset;

  if (!uploadUrl || !asset) {
    throw new Error('Failed to get upload URL from LinkedIn');
  }

  // Step 2: Convert base64 to binary and upload
  // Strip the data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const binaryData = Buffer.from(base64Data, 'base64');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: binaryData,
  });

  if (!uploadRes.ok && uploadRes.status !== 201) {
    throw new Error(`Image upload failed (${uploadRes.status})`);
  }

  // Return the asset URN to use in the post
  return asset;
}
