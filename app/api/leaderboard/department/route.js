import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

// Point values (same as company-wide leaderboard)
const POINTS = {
  DEAL_CLOSED: 1000,
  CALL: 100,
  FOLLOWUP: 100,
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load all relevant data
  const [submissions, users, deductions] = await Promise.all([
    readData('submissions').catch(() => []),
    readData('users').catch(() => []),
    readData('deductions').catch(() => []),
  ]);

  // Find the logged-in user's department
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  
  const department = currentUser.department;
  if (!department) {
    return NextResponse.json({ leaderboard: [], department: 'Unknown', points: POINTS });
  }

  // Filter users to only those in the same department
  const deptUsers = users.filter(u => u.department === department);
  const deptUserIds = new Set(deptUsers.map(u => u.id));

  // Build per-user stats from real submissions (department-scoped)
  const userStats = {};

  // Initialize department users only
  for (const u of deptUsers) {
    userStats[u.id] = {
      userId: u.id,
      name: u.name || 'Unknown',
      department: u.department,
      dealsCount: 0,
      callsMade: 0,
      followUps: 0,
      dealValue: 0,
      score: 0,
    };
  }

  // Process all submissions for this department
  for (const sub of submissions) {
    // Ignore rejected forms from leaderboard scoring
    if (sub.status === 'Rejected') continue;
    
    // Deal Closed forms must be explicitly Approved to count
    if (sub.formType === 'Deal Closed' && sub.status !== 'Approved') continue;

    const uid = sub.userId;
    if (!deptUserIds.has(uid)) continue; // Skip non-department submissions
    if (!userStats[uid]) continue;

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
        const calls = Number(sub.data?.totalCalls || 0);
        stats.callsMade += calls;
        stats.score += calls * POINTS.CALL;
        break;

      default:
        break;
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
    .filter(u => u.score > 0 || u.dealsCount > 0 || u.callsMade > 0 || u.followUps > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry, idx, arr) => ({
      ...entry,
      rank: idx + 1,
      trend: idx === 0 ? 'same' : entry.score >= (arr[Math.max(0, idx - 1)]?.score || 0) ? 'up' : 'down',
    }));

  return NextResponse.json({ leaderboard, department, points: POINTS });
}
