import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// GET: fetch today's active session + monthly logged hours
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const col = db.collection('timesessions');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Find today's active session (not yet clocked out)
  const activeSession = await col.findOne({
    userId: session.id,
    date: todayStr,
    logoutTime: null,
  });

  // Find all of today's sessions (including completed ones)
  const todaySessions = await col.find({
    userId: session.id,
    date: todayStr,
  }).toArray();

  // Calculate today's total seconds from completed sessions
  let todayTotalSeconds = 0;
  for (const s of todaySessions) {
    if (s.logoutTime) {
      todayTotalSeconds += s.totalSeconds || 0;
    }
  }

  // Monthly sessions
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const monthlySessions = await col.find({
    userId: session.id,
    date: { $gte: monthStart, $lte: monthEnd },
  }).toArray();

  let monthlyTotalSeconds = 0;
  for (const s of monthlySessions) {
    if (s.logoutTime) {
      monthlyTotalSeconds += s.totalSeconds || 0;
    }
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
    // Check if there's already an active session today
    const existing = await col.findOne({
      userId: session.id,
      date: todayStr,
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
      date: todayStr,
      logoutTime: null,
    });

    if (!activeSession) {
      return NextResponse.json({ message: 'No active session' });
    }

    const logoutTime = now.toISOString();
    const totalSeconds = Math.floor((now - new Date(activeSession.loginTime)) / 1000);

    await col.updateOne(
      { _id: activeSession._id },
      { $set: { logoutTime, totalSeconds } }
    );

    // Now sync to attendance collection
    await syncAttendance(session.id, todayStr, col, attCol);

    return NextResponse.json({ success: true, totalSeconds });
  }

  if (action === 'heartbeat') {
    // Update the last heartbeat time on the active session
    await col.updateOne(
      { userId: session.id, date: todayStr, logoutTime: null },
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
