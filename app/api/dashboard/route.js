import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leads = (await readData('leads')).filter(l => l.userId === session.id);
  const tasks = (await readData('tasks')).filter(t => t.userId === session.id);
  const submissions = (await readData('submissions')).filter(s => s.userId === session.id);
  const attendance = (await readData('attendance')).filter(a => a.userId === session.id);

  const dealsClosed = leads.filter(l => l.status === 'Closed').length;
  const tasksPending = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;

  // Attendance streak
  let streak = 0;
  const sorted = [...attendance].filter(a => a.status === 'Present').sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sorted.length > 0) {
    streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i-1].date) - new Date(sorted[i].date)) / (1000*60*60*24);
      if (diff <= 3) streak++; else break; // allow weekends
    }
  }

  // Today's activity count
  const today = new Date().toISOString().split('T')[0];
  const todaySubs = submissions.filter(s => s.submittedAt?.startsWith(today)).length;

  // Recent activity
  const activity = [];
  submissions.slice(-5).reverse().forEach(s => {
    activity.push({ icon: '📋', text: `Submitted ${s.formType}`, time: new Date(s.submittedAt).toLocaleDateString(), type: s.status.toLowerCase() });
  });
  leads.slice(-3).reverse().forEach(l => {
    activity.push({ icon: '👥', text: `Lead: ${l.companyName}`, time: new Date(l.updatedAt).toLocaleDateString(), type: l.status.toLowerCase() });
  });
  tasks.filter(t => t.status !== 'Completed').slice(0, 2).forEach(t => {
    activity.push({ icon: '📨', text: `Task: ${t.title}`, time: new Date(t.deadline).toLocaleDateString(), type: t.priority.toLowerCase() });
  });

  return NextResponse.json({
    stats: { totalLeads: leads.length, tasksPending, dealsClosed, todayActivity: todaySubs, streak },
    activity: activity.slice(0, 8),
  });
}
