import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// GET — Handle DigiLocker OAuth callback
export async function GET(req) {
  // 1. Authenticate user via JWT session cookie (survives redirect because of sameSite: 'lax')
  const session = await getSession();
  
  if (!session) {
    console.log('❌ [DigiLocker] No valid auth-token cookie — session lost');
    return NextResponse.redirect(new URL('/dashboard?dl_error=Session+expired.+Please+try+again.', req.url));
  }

  const userId = session.id;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error) {
    console.log(`❌ [DigiLocker] Auth error: ${error} — ${error_description}`);
    return NextResponse.redirect(new URL(`/dashboard?dl_error=${encodeURIComponent(error_description || error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?dl_error=No+authorization+code+received', req.url));
  }

  const CLIENT_ID = process.env.DIGILOCKER_CLIENT_ID;
  const CLIENT_SECRET = process.env.DIGILOCKER_CLIENT_SECRET;
  const REDIRECT_URI = process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:3001/api/digilocker/callback';
  const BASE_URL = process.env.DIGILOCKER_BASE_URL || 'https://digilocker.meripehchaan.gov.in/public';

  // Get PKCE verifier from cookie
  const code_verifier = req.cookies.get('dl_code_verifier')?.value || '';

  try {
    console.log(`🔑 [DigiLocker] Exchanging authorization code for user ${userId}...`);

    // Exchange code for token
    const tokenParams = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: code_verifier,
    });

    const tokenRes = await fetch(`${BASE_URL}/oauth2/2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.log(`❌ [DigiLocker] Token exchange failed:`, errData);
      return NextResponse.redirect(new URL(`/dashboard?dl_error=${encodeURIComponent(errData.error_description || errData.error || 'Token exchange failed')}`, req.url));
    }

    const token = await tokenRes.json();
    console.log('✅ [DigiLocker] Token obtained! Keys:', Object.keys(token));

    // Extract user info from multiple sources
    let dlUser = {};

    // Source 1: Decode id_token JWT
    if (token.id_token) {
      try {
        const parts = token.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          console.log('🪪 [DigiLocker] id_token claims:', JSON.stringify(payload, null, 2));
          dlUser = {
            name: payload.name || payload.given_name || payload.preferred_username,
            dob: payload.birthdate || payload.dob,
            gender: payload.gender,
            email: payload.email,
            mobile: payload.phone_number || payload.mobile,
            aadhaar: payload.aadhaar || payload.uid || payload.masked_aadhaar,
            digilockerid: payload.digilockerid || payload.sub,
            address: payload.address,
            photo: payload.picture,
            reference_key: payload.reference_key,
            username: payload.username || payload.preferred_username,
            pan: payload.pan || payload.pan_number,
            dl_no: payload.dl_no || payload.driving_licence || payload.driving_license,
            _idTokenClaims: payload,
          };
        }
      } catch (jwtErr) {
        console.log('⚠️ [DigiLocker] Could not decode id_token:', jwtErr.message);
      }
    }

    // Source 2: Token response fields
    if (token.digilockerid) dlUser.digilockerid = token.digilockerid;
    if (token.name) dlUser.name = token.name;
    if (token.dob) dlUser.dob = token.dob;
    if (token.gender) dlUser.gender = token.gender;
    if (token.aadhaar) dlUser.aadhaar = token.aadhaar;
    if (token.mobile) dlUser.mobile = token.mobile;
    if (token.email) dlUser.email = token.email;
    if (token.reference_key) dlUser.reference_key = token.reference_key;
    if (token.username) dlUser.username = token.username;
    if (token.pan) dlUser.pan = token.pan;
    if (token.dl_no) dlUser.dl_no = token.dl_no;
    if (token.driving_licence) dlUser.dl_no = token.driving_licence;

    // Source 3: Try /user API
    if (token.access_token) {
      try {
        const userRes = await fetch(`${BASE_URL}/oauth2/1/user`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (userRes.ok) {
          const apiUser = await userRes.json();
          console.log('✅ [DigiLocker] User API response:', JSON.stringify(apiUser, null, 2));
          dlUser = { ...dlUser, ...apiUser };
        }
      } catch (e) {
        console.log('⚠️ [DigiLocker] User API failed (expected):', e.message);
      }
    }

    // Try to get issued documents
    let documents = null;
    if (token.access_token) {
      try {
        const docsRes = await fetch(`${BASE_URL}/oauth2/2/files/issued`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (docsRes.ok) {
          documents = await docsRes.json();
          console.log(`📄 [DigiLocker] ${documents?.items?.length || 0} documents fetched`);
        }
      } catch (e) {
        console.log('⚠️ [DigiLocker] Docs fetch failed:', e.message);
      }
    }

    // ════════════ EXTRA EXTRACTION & FORMATTING FOR ADMIN DISPLAY ════════════
    // 1. Extract PAN and Driving Licence from documents items if not already set
    if (documents && documents.items) {
      for (const item of documents.items) {
        const doctype = (item.doctype || '').toUpperCase();
        const uri = item.uri || '';
        const name = (item.name || '').toUpperCase();
        
        // Match PAN Card
        if ((!dlUser.pan || dlUser.pan === '') && (doctype === 'PANCR' || name.includes('PAN') || doctype.includes('PAN'))) {
          if (uri) {
            const parts = uri.split('-');
            const extractedPan = parts[parts.length - 1];
            if (extractedPan && extractedPan.length >= 5 && extractedPan !== 'PANCR') {
              dlUser.pan = extractedPan;
              console.log(`🔎 [DigiLocker] Extracted PAN from document URI: ${extractedPan}`);
            }
          }
        }
        
        // Match Driving License
        if ((!dlUser.dl_no || dlUser.dl_no === '') && (doctype === 'DRVLC' || name.includes('DRIVING') || doctype.includes('DRV'))) {
          if (uri) {
            const parts = uri.split('-');
            const extractedDl = parts[parts.length - 1];
            if (extractedDl && extractedDl.length >= 5 && extractedDl !== 'DRVLC') {
              dlUser.dl_no = extractedDl;
              console.log(`🔎 [DigiLocker] Extracted DL from document URI: ${extractedDl}`);
            }
          }
        }
      }
    }

    // 2. Ensure Aadhaar is populated (using masked_aadhaar if full is not present)
    if (!dlUser.aadhaar || dlUser.aadhaar === '') {
      dlUser.aadhaar = dlUser.masked_aadhaar || 
                       (dlUser._idTokenClaims && (dlUser._idTokenClaims.masked_aadhaar || dlUser._idTokenClaims.aadhaar || dlUser._idTokenClaims.uid)) || 
                       null;
    }

    // 3. Ensure base64 Photo / Picture is populated
    if (!dlUser.photo) {
      dlUser.photo = dlUser.picture || 
                     (dlUser._idTokenClaims && dlUser._idTokenClaims.picture) || 
                     null;
    }

    // 4. Ensure DOB is set correctly and format is mapped
    if (!dlUser.dob) {
      dlUser.dob = dlUser.birthdate || 
                   (dlUser._idTokenClaims && (dlUser._idTokenClaims.birthdate || dlUser._idTokenClaims.dob)) || 
                   null;
    }

    // 5. Calculate age based on DOB
    if (dlUser.dob) {
      try {
        let birthDate = null;
        const dobStr = dlUser.dob.toString().trim();
        
        // Check format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
          const parts = dobStr.split('-');
          birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
        // Check format DDMMYYYY
        else if (/^\d{8}$/.test(dobStr)) {
          const part1 = parseInt(dobStr.substring(0, 2), 10);
          const part2 = parseInt(dobStr.substring(2, 4), 10);
          const year = parseInt(dobStr.substring(4, 8), 10);
          let day = part1;
          let month = part2;
          if (part2 > 12) {
            day = part2;
            month = part1;
          }
          birthDate = new Date(year, month - 1, day);
        }
        // Check format with separators (e.g. DD-MM-YYYY, MM-DD-YYYY, DD/MM/YYYY, MM/DD/YYYY)
        else {
          const parts = dobStr.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else if (parts[2].length === 4) {
              const val1 = parseInt(parts[0], 10);
              const val2 = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              
              let day = val1;
              let month = val2;
              
              if (val2 > 12) {
                day = val2;
                month = val1;
              } else if (val1 > 12) {
                day = val1;
                month = val2;
              }
              birthDate = new Date(year, month - 1, day);
            }
          }
        }

        if (birthDate && !isNaN(birthDate.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          dlUser.age = calculatedAge;
          console.log(`🔎 [DigiLocker] Calculated age: ${calculatedAge} from DOB: ${dlUser.dob}`);
        }
      } catch (ageErr) {
        console.log('⚠️ [DigiLocker] Age calculation failed:', ageErr.message);
      }
    }

    // 6. Map gender consistently
    if (dlUser.gender) {
      const g = dlUser.gender.toString().toUpperCase();
      if (g === 'M' || g === 'MALE') dlUser.gender = 'M';
      else if (g === 'F' || g === 'FEMALE') dlUser.gender = 'F';
    }

    // Save verification data to MongoDB
    const db = await getDb();
    const verificationData = {
      userId: userId,
      verified: true,
      digilockerid: dlUser.digilockerid || null,
      name: dlUser.name || null,
      dob: dlUser.dob || null,
      age: dlUser.age || null,
      gender: dlUser.gender || null,
      aadhaar: dlUser.aadhaar || null,
      mobile: dlUser.mobile || null,
      email: dlUser.email || null,
      reference_key: dlUser.reference_key || null,
      username: dlUser.username || null,
      pan: dlUser.pan || null,
      dl_no: dlUser.dl_no || dlUser.driving_licence || null,
      photo: dlUser.photo || dlUser.picture || null,
      documents: documents || null,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('digilocker_verifications').updateOne(
      { userId: userId },
      { $set: verificationData },
      { upsert: true }
    );

    // Flag user as verified
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { digilockerVerified: true, digilockerVerifiedAt: verificationData.verifiedAt } }
    );

    console.log(`🟢 [DigiLocker] User ${userId} verified successfully! DL ID: ${dlUser.digilockerid || 'N/A'}`);

    // Clean up cookies and redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard?dl_verified=true', req.url));
    response.cookies.delete('dl_code_verifier');
    response.cookies.delete('dl_state');
    response.cookies.delete('dl_nonce');

    return response;

  } catch (err) {
    console.error('❌ [DigiLocker] Callback failed:', err.message);
    return NextResponse.redirect(new URL(`/dashboard?dl_error=${encodeURIComponent(err.message)}`, req.url));
  }
}
