import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, readData } from '@/lib/db';

/**
 * POST /api/content/publish
 * Publishes a content post to the Cluso InfoLink LinkedIn Company Page.
 * Images are uploaded directly to LinkedIn's servers — NOT stored in MongoDB.
 * 
 * Strategy:
 * 1. Try posting as the organization (company page) using the Posts API
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
      console.log(`[LinkedIn] Attempting to post as organization: ${orgUrn}`);
      const result = await postViaPostsApi(accessToken, orgUrn, post, postText, imageBase64);
      result.postedAs = 'organization';
      console.log(`[LinkedIn] ✅ Successfully posted as ORGANIZATION (Cluso InfoLink)`);
      return result;
    } catch (orgError) {
      console.error(`[LinkedIn] Organization posting failed (${orgError.message}). Falling back to personal...`);
      // Fall through to personal profile posting
    }
  }

  // Fall back to personal profile
  if (personUrn) {
    console.log(`[LinkedIn] Posting as personal profile: ${personUrn}`);
    const result = await postViaPostsApi(accessToken, personUrn, post, postText, imageBase64);
    result.postedAs = 'personal';
    console.log(`[LinkedIn] ✅ Posted as PERSONAL profile (fallback)`);
    return result;
  }

  throw new Error('No valid LinkedIn identity available for posting.');
}

/**
 * Post via LinkedIn's REST Posts API (replaces deprecated UGC API)
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 */
async function postViaPostsApi(accessToken, authorUrn, post, postText, imageBase64) {
  // LinkedIn API version — use latest active version (YYYYMM format)
  const linkedinVersion = '202604';
  
  let imageId = null;

  // Upload image if provided — directly to LinkedIn via Images API
  if (imageBase64) {
    imageId = await uploadImageViaImagesApi(accessToken, authorUrn, imageBase64, linkedinVersion);
  }

  // Build the post payload per LinkedIn Posts API spec
  const payload = {
    author: authorUrn,
    commentary: postText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  // Add image content if uploaded
  if (imageId) {
    payload.content = {
      media: {
        title: post.title,
        id: imageId,
      },
    };
  }

  console.log(`[LinkedIn] POST /rest/posts — author: ${authorUrn}, version: ${linkedinVersion}`);

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': linkedinVersion,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[LinkedIn] Posts API error (${response.status}):`, errText);
    throw new Error(`LinkedIn post failed (${response.status}): ${errText}`);
  }

  // The post ID is returned in the x-restli-id response header
  const postId = response.headers.get('x-restli-id') || 'posted';
  return { id: postId };
}

/**
 * Uploads an image directly to LinkedIn's servers via the Images API.
 * The image is NOT stored in MongoDB — it only lives on LinkedIn.
 * 
 * Flow (2-step):
 * 1. Initialize upload → get uploadUrl + image URN
 * 2. PUT the binary image data to the uploadUrl
 * 3. Return the image URN to reference in the post
 * 
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api
 */
async function uploadImageViaImagesApi(accessToken, ownerUrn, imageBase64, linkedinVersion) {
  // Step 1: Initialize upload
  const initPayload = {
    initializeUploadRequest: {
      owner: ownerUrn,
    },
  };

  console.log(`[LinkedIn] Initializing image upload for owner: ${ownerUrn}`);

  const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': linkedinVersion,
    },
    body: JSON.stringify(initPayload),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    console.error(`[LinkedIn] Image init failed (${initRes.status}):`, errText);
    throw new Error(`Image upload init failed (${initRes.status}): ${errText}`);
  }

  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error('Failed to get upload URL from LinkedIn Images API');
  }

  console.log(`[LinkedIn] Got upload URL, image URN: ${imageUrn}`);

  // Step 2: Convert base64 to binary and upload
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

  console.log(`[LinkedIn] ✅ Image uploaded successfully: ${imageUrn}`);
  return imageUrn;
}
