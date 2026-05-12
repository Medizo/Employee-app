import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;

function calcWorkingSeconds(loginISO, logoutISO) {
  const start = new Date(loginISO);
  const end = new Date(logoutISO);
  if (end <= start) return 0;

  let totalSecs = 0;
  const cursor = new Date(start);

  while (cursor < end) {
    const dayStart = new Date(cursor);
    dayStart.setHours(WORK_START_HOUR, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

    const effectiveStart = cursor < dayStart ? dayStart : new Date(cursor);
    const effectiveEnd = end < dayEnd ? new Date(end) : dayEnd;

    if (effectiveStart < effectiveEnd && effectiveStart < dayEnd && effectiveEnd > dayStart) {
      totalSecs += Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
    }

    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return Math.max(0, totalSecs);
}

export async function POST() {
  // Auto clock-out before clearing session
  try {
    const session = await getSession();
    if (session) {
      const db = await getDb();
      const col = db.collection('timesessions');
      const attCol = db.collection('attendance');
      const now = new Date();

      // Find ALL active sessions for this user (any date)
      const activeSessions = await col.find({
        userId: session.id,
        logoutTime: null,
      }).toArray();

      for (const activeSession of activeSessions) {
        const logoutTime = now.toISOString();
        const totalSeconds = calcWorkingSeconds(activeSession.loginTime, logoutTime);

        await col.updateOne(
          { _id: activeSession._id },
          { $set: { logoutTime, totalSeconds } }
        );

        // Sync attendance for that session's date
        const dateStr = activeSession.date;
        const sessions = await col.find({ userId: session.id, date: dateStr, logoutTime: { $ne: null } }).toArray();
        const totalSecs = sessions.reduce((sum, s) => sum + (s.totalSeconds || 0), 0);
        const totalHours = Math.round((totalSecs / 3600) * 10) / 10;

        const loginTimes = sessions.map(s => new Date(s.loginTime));
        const logoutTimes = sessions.map(s => new Date(s.logoutTime));
        const earliestLogin = new Date(Math.min(...loginTimes));
        const latestLogout = new Date(Math.max(...logoutTimes));

        const loginTimeStr = earliestLogin.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const logoutTimeStr = latestLogout.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const status = totalHours >= 4 ? 'Present' : totalHours > 0 ? 'Half Day' : 'Absent';

        const existing = await attCol.findOne({ userId: session.id, date: dateStr });
        if (existing) {
          await attCol.updateOne(
            { userId: session.id, date: dateStr },
            { $set: { totalHours, loginTime: loginTimeStr, logoutTime: logoutTimeStr, status, workMode: 'Auto-tracked' } }
          );
        } else {
          await attCol.insertOne({
            id: `att-${session.id}-${dateStr}`,
            userId: session.id,
            date: dateStr,
            status,
            totalHours,
            loginTime: loginTimeStr,
            logoutTime: logoutTimeStr,
            workMode: 'Auto-tracked',
          });
        }
      }
    }
  } catch (err) {
    console.error('Auto clock-out error (non-fatal):', err);
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
