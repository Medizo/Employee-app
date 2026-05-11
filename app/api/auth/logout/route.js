import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST() {
  // Auto clock-out before clearing session
  try {
    const session = await getSession();
    if (session) {
      const db = await getDb();
      const col = db.collection('timesessions');
      const attCol = db.collection('attendance');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const activeSession = await col.findOne({
        userId: session.id,
        date: todayStr,
        logoutTime: null,
      });

      if (activeSession) {
        const logoutTime = now.toISOString();
        const totalSeconds = Math.floor((now - new Date(activeSession.loginTime)) / 1000);

        await col.updateOne(
          { _id: activeSession._id },
          { $set: { logoutTime, totalSeconds } }
        );

        // Sync to attendance collection
        const sessions = await col.find({ userId: session.id, date: todayStr, logoutTime: { $ne: null } }).toArray();
        const totalSecs = sessions.reduce((sum, s) => sum + (s.totalSeconds || 0), 0);
        const totalHours = Math.round((totalSecs / 3600) * 10) / 10;

        const loginTimes = sessions.map(s => new Date(s.loginTime));
        const logoutTimes = sessions.map(s => new Date(s.logoutTime));
        const earliestLogin = new Date(Math.min(...loginTimes));
        const latestLogout = new Date(Math.max(...logoutTimes));

        const loginTimeStr = earliestLogin.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const logoutTimeStr = latestLogout.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const status = totalHours >= 4 ? 'Present' : totalHours > 0 ? 'Half Day' : 'Absent';

        const existing = await attCol.findOne({ userId: session.id, date: todayStr });
        if (existing) {
          await attCol.updateOne(
            { userId: session.id, date: todayStr },
            { $set: { totalHours, loginTime: loginTimeStr, logoutTime: logoutTimeStr, status, workMode: 'Auto-tracked' } }
          );
        } else {
          await attCol.insertOne({
            id: `att-${session.id}-${todayStr}`,
            userId: session.id,
            date: todayStr,
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
