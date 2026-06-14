import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function calculateAge(dob) {
  if (!dob) return null;
  try {
    let birthDate = null;
    const dobStr = dob.toString().trim();
    
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
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
  } catch (err) {
    console.error('Age calculation error:', err);
  }
  return null;
}

// GET — Fetch the current user's DigiLocker verification status
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const record = await db.collection('digilocker_verifications').findOne({ userId: session.id });

  if (!record) {
    return NextResponse.json({ verified: false });
  }

  const { _id, ...data } = record;
  if (data.dob) {
    data.age = calculateAge(data.dob);
  }
  return NextResponse.json({ verified: true, ...data });
}

// POST — Save DigiLocker verification data after the user completes MeriPehchan flow
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const db = await getDb();

  const verificationData = {
    userId: session.id,
    verified: true,
    digilockerid: body.digilockerid || null,
    name: body.name || null,
    dob: body.dob || null,
    age: calculateAge(body.dob),
    gender: body.gender || null,
    aadhaar: body.aadhaar || null,
    mobile: body.mobile || null,
    email: body.email || null,
    documents: body.documents || null,
    icjs: body.icjs || null,
    apaar: body.apaar || null,
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('digilocker_verifications').updateOne(
    { userId: session.id },
    { $set: verificationData },
    { upsert: true }
  );

  // Also update the user record to flag as digilocker verified
  await db.collection('users').updateOne(
    { id: session.id },
    { $set: { digilockerVerified: true, digilockerVerifiedAt: verificationData.verifiedAt } }
  );

  return NextResponse.json({ success: true, verified: true });
}
