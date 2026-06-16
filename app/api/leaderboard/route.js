import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

// Point values
const POINTS = {
  DEAL_CLOSED: 1000,
  CALL: 100,
  FOLLOWUP: 100,
  CONTACTED: 10,
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load all relevant data
  const [submissions, users, deductions, tasks] = await Promise.all([
    readData('submissions').catch(() => []),
    readData('users').catch(() => []),
    readData('deductions').catch(() => []), // gracefully handle if deductions collection doesn't exist yet
    readData('tasks').catch(() => []),
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
      emailsSent: 0,
      followUps: 0,
      dealValue: 0,
      completedTasksCount: 0,
      pendingTasksCount: 0,
      score: 0,
      hideFromLeaderboard: u.hideFromLeaderboard || false,
    };
  }

  // Process all submissions
  for (const sub of submissions) {
    // Ignore rejected forms from leaderboard scoring
    if (sub.status === 'Rejected') continue;
    
    // Deal Closed forms must be explicitly Approved to count
    if (sub.formType === 'Deal Closed' && sub.status !== 'Approved') continue;

    const uid = sub.userId;
    if (!userStats[uid]) {
      // User exists in submissions but not in users (shouldn't happen, but handle)
      userStats[uid] = {
        userId: uid,
        name: 'Unknown',
        dealsCount: 0,
        callsMade: 0,
        emailsSent: 0,
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
        // Extract calls, emails and follow-ups from daily reports
        const calls = Number(sub.data?.totalCalls || 0);
        const emails = Number(sub.data?.totalEmails || 0);
        const followups = Number(sub.data?.followUps || 0);
        stats.callsMade += calls;
        stats.emailsSent += emails;
        // Award points per call and email logged in daily reports
        stats.score += calls * POINTS.CALL;
        stats.score += emails * POINTS.CONTACTED;
        // Don't double-count follow-ups if filed as separate follow-up form
        break;

      default:
        break;
    }
  }

  // Process tasks
  if (tasks && tasks.length > 0) {
    for (const t of tasks) {
      const uid = t.userId;
      if (userStats[uid]) {
        const stats = userStats[uid];
        if (t.status === 'Completed') {
          stats.completedTasksCount += 1;
          stats.score += 5;
        } else {
          stats.pendingTasksCount += 1;
          const isOverdue = t.deadline && new Date(t.deadline) < new Date();
          if (isOverdue) {
            stats.score -= 4;
          }
        }
      }
    }
  }

  // Process deductions
  if (deductions && deductions.length > 0) {
    for (const ded of deductions) {
      const uid = ded.employeeId;
      if (userStats[uid]) {
        userStats[uid].score -= (Number(ded.points) || 0);
      }
    }
  }

  // Convert to array, compute trends, sort
  const leaderboard = Object.values(userStats)
    .filter(u => !u.hideFromLeaderboard && (
      u.score !== 0 || 
      u.dealsCount > 0 || 
      u.callsMade > 0 || 
      u.followUps > 0 ||
      u.completedTasksCount > 0 ||
      u.pendingTasksCount > 0
    ))
    .sort((a, b) => b.score - a.score)
    .map((entry, idx, arr) => ({
      ...entry,
      rank: idx + 1,
      trend: idx === 0 ? 'same' : entry.score >= (arr[Math.max(0, idx - 1)]?.score || 0) ? 'up' : 'down',
    }));

  return NextResponse.json({ leaderboard, points: POINTS });
}
