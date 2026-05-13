import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

// Point values
const POINTS = {
  DEAL_CLOSED: 1000,
  CALL: 100,
  FOLLOWUP: 100,
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load all relevant data
  const [submissions, users] = await Promise.all([
    readData('submissions'),
    readData('users'),
  ]);

  // Build per-user stats from real submissions
  const userStats = {};

  // Initialize all users
  for (const u of users) {
    userStats[u.id] = {
      userId: u.id,
      name: u.name || 'Unknown',
      dealsCount: 0,
      callsMade: 0,
      followUps: 0,
      dealValue: 0,
      score: 0,
    };
  }

  // Process all submissions
  for (const sub of submissions) {
    const uid = sub.userId;
    if (!userStats[uid]) {
      // User exists in submissions but not in users (shouldn't happen, but handle)
      userStats[uid] = {
        userId: uid,
        name: 'Unknown',
        dealsCount: 0,
        callsMade: 0,
        followUps: 0,
        dealValue: 0,
        score: 0,
      };
    }

    const stats = userStats[uid];

    switch (sub.formType) {
      case 'Deal Closed':
        stats.dealsCount += 1;
        stats.dealValue += Number(sub.data?.dealValue || 0);
        stats.score += POINTS.DEAL_CLOSED;
        break;

      case 'Client Follow-up':
        stats.followUps += 1;
        stats.score += POINTS.FOLLOWUP;
        break;

      case 'Daily Activity Report':
        // Extract calls and follow-ups from daily reports
        const calls = Number(sub.data?.totalCalls || 0);
        const followups = Number(sub.data?.followUps || 0);
        stats.callsMade += calls;
        // Award points per call logged in daily reports
        stats.score += calls * POINTS.CALL;
        // Don't double-count follow-ups if filed as separate follow-up form
        break;

      default:
        break;
    }
  }

  // Convert to array, compute trends, sort
  const leaderboard = Object.values(userStats)
    .filter(u => u.score > 0 || u.dealsCount > 0 || u.callsMade > 0 || u.followUps > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry, idx, arr) => ({
      ...entry,
      rank: idx + 1,
      trend: idx === 0 ? 'same' : entry.score >= (arr[Math.max(0, idx - 1)]?.score || 0) ? 'up' : 'down',
    }));

  return NextResponse.json({ leaderboard, points: POINTS });
}
