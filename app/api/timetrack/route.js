import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// ── Helpers ──────────────────────────────────────────────
const WORK_START_HOUR = 8;  // 8:00 AM
const WORK_END_HOUR = 20;   // 8:00 PM
const HEARTBEAT_STALE_MS = 3 * 60 * 1000; // 3 min — if heartbeat older than this, session is stale

/**
 * Calculate working seconds between two timestamps, 
 * only counting time within the 8 AM – 8 PM window.
 */
function calcWorkingSeconds(loginISO, logoutISO) {
  const start = new Date(loginISO);
  const end = new Date(logoutISO);

  if (end <= start) return 0;

  let totalSecs = 0;
  const cursor = new Date(start);

  // Process day by day
  while (cursor < end) {
    const dayStart = new Date(cursor);
    dayStart.setHours(WORK_START_HOUR, 0, 0, 0);

    const dayEnd = new Date(cursor);
    dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

    // Effective start for this day
    const effectiveStart = cursor < dayStart ? dayStart : new Date(cursor);
    // Effective end for this day
    const nextMidnight = new Date(cursor);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const effectiveEnd = end < dayEnd ? new Date(end) : dayEnd;

    if (effectiveStart < effectiveEnd && effectiveStart < dayEnd && effectiveEnd > dayStart) {
      totalSecs += Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
    }

    // Move to start of next day
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return Math.max(0, totalSecs);
}

// GET: fetch today's active session + monthly logged hours
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const localDate = searchParams.get('localDate');

  const db = await getDb();
  const col = db.collection('timesessions');

  const now = new Date();
  const todayStr = localDate || now.toISOString().split('T')[0];

  // ── Auto-close stale sessions (heartbeat > 3 min ago) ──
  const staleSessions = await col.find({
    userId: session.id,
    logoutTime: null,
    lastHeartbeat: { $lt: new Date(now.getTime() - HEARTBEAT_STALE_MS).toISOString() },
  }).toArray();

  for (const stale of staleSessions) {
    const logoutTime = stale.lastHeartbeat; // use last heartbeat as logout
    const totalSeconds = calcWorkingSeconds(stale.loginTime, logoutTime);
    await col.updateOne({ _id: stale._id }, { $set: { logoutTime, totalSeconds } });
    // Sync attendance for the stale session's date
    const attCol = db.collection('attendance');
    await syncAttendance(session.id, stale.date, col, attCol);
  }

  // Find today's active session (not yet clocked out)
  const activeSession = await col.findOne({
    userId: session.id,
    logoutTime: null,
  });

  // Find all of today's completed sessions
  const todaySessions = await col.find({
    userId: session.id,
    date: todayStr,
    logoutTime: { $ne: null },
  }).toArray();

  let todayTotalSeconds = 0;
  for (const s of todaySessions) {
    todayTotalSeconds += s.totalSeconds || 0;
  }

  // Monthly sessions (completed only)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const monthlySessions = await col.find({
    userId: session.id,
    date: { $gte: monthStart, $lte: monthEnd },
    logoutTime: { $ne: null },
  }).toArray();

  let monthlyTotalSeconds = 0;
  for (const s of monthlySessions) {
    monthlyTotalSeconds += s.totalSeconds || 0;
  }

  return NextResponse.json({
    activeSession: activeSession ? {
      loginTime: activeSession.loginTime,
      date: activeSession.date,
    } : null,
    todayTotalSeconds,
    monthlyTotalSeconds,
  });
}

// POST: clock in, clock out, or heartbeat
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await req.json();
  const db = await getDb();
  const col = db.collection('timesessions');
  const attCol = db.collection('attendance');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (action === 'clockin') {
    // Check if there's already an active session
    const existing = await col.findOne({
      userId: session.id,
      logoutTime: null,
    });

    if (existing) {
      return NextResponse.json({ message: 'Already clocked in', loginTime: existing.loginTime });
    }

    const loginTime = now.toISOString();
    await col.insertOne({
      userId: session.id,
      date: todayStr,
      loginTime,
      logoutTime: null,
      totalSeconds: 0,
      lastHeartbeat: loginTime,
    });

    return NextResponse.json({ success: true, loginTime });
  }

  if (action === 'clockout') {
    const activeSession = await col.findOne({
      userId: session.id,
      logoutTime: null,
    });

    if (!activeSession) {
      return NextResponse.json({ message: 'No active session' });
    }

    const logoutTime = now.toISOString();
    const totalSeconds = calcWorkingSeconds(activeSession.loginTime, logoutTime);

    await col.updateOne(
      { _id: activeSession._id },
      { $set: { logoutTime, totalSeconds } }
    );

    // Now sync to attendance collection
    await syncAttendance(session.id, activeSession.date, col, attCol);

    return NextResponse.json({ success: true, totalSeconds });
  }

  if (action === 'heartbeat') {
    // Update the last heartbeat time on any active session for this user
    await col.updateOne(
      { userId: session.id, logoutTime: null },
      { $set: { lastHeartbeat: now.toISOString() } }
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Sync time tracking data to the attendance collection for calendar view
async function syncAttendance(userId, dateStr, timeCol, attCol) {
  const sessions = await timeCol.find({ userId, date: dateStr, logoutTime: { $ne: null } }).toArray();
  if (sessions.length === 0) return;

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.totalSeconds || 0), 0);
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  // Find the earliest login and latest logout
  const loginTimes = sessions.map(s => new Date(s.loginTime));
  const logoutTimes = sessions.map(s => new Date(s.logoutTime));
  const earliestLogin = new Date(Math.min(...loginTimes));
  const latestLogout = new Date(Math.max(...logoutTimes));

  const loginTimeStr = earliestLogin.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const logoutTimeStr = latestLogout.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const status = totalHours >= 4 ? 'Present' : totalHours > 0 ? 'Half Day' : 'Absent';

  // Upsert into attendance collection
  const existing = await attCol.findOne({ userId, date: dateStr });
  if (existing) {
    await attCol.updateOne(
      { userId, date: dateStr },
      { $set: { totalHours, loginTime: loginTimeStr, logoutTime: logoutTimeStr, status, workMode: 'Auto-tracked' } }
    );
  } else {
    await attCol.insertOne({
      id: `att-${userId}-${dateStr}`,
      userId,
      date: dateStr,
      status,
      totalHours,
      loginTime: loginTimeStr,
      logoutTime: logoutTimeStr,
      workMode: 'Auto-tracked',
    });
  }
}
