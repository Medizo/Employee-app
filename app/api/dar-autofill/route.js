import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData } from '@/lib/db';

/**
 * GET /api/dar-autofill
 * Returns today's tracked activity counts for auto-populating the Daily Activity Report.
 * Query: ?localDate=YYYY-MM-DD (the employee's local date)
 */
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const localDate = searchParams.get('localDate') || new Date().toISOString().split('T')[0];

  // Load all data sources in parallel
  const [emails, followups, leads, submissions] = await Promise.all([
    readData('emails').catch(() => []),
    readData('followups').catch(() => []),
    readData('leads').catch(() => []),
    readData('submissions').catch(() => []),
  ]);

  // ═══ Filter to this user's data ═══
  const myEmails = emails.filter(e => e.userId === session.id);
  const myFollowups = followups.filter(f => f.userId === session.id);
  const myLeads = leads.filter(l => l.userId === session.id);
  const mySubmissions = submissions.filter(s => s.userId === session.id);

  // ═══ Today's emails sent (status = Delivered) ═══
  const todayEmails = myEmails.filter(e => {
    if (e.status !== 'Delivered') return false;
    return e.sentAt?.startsWith(localDate);
  });

  // ═══ Today's follow-ups ═══
  const todayFollowups = myFollowups.filter(f => {
    // Follow-up date field is YYYY-MM-DD, or fallback to createdAt
    const fDate = f.date || (f.createdAt ? f.createdAt.split('T')[0] : '');
    return fDate === localDate;
  });

  // ═══ Count calls (Phone Call mode follow-ups) ═══
  const totalCalls = todayFollowups.filter(f =>
    f.mode === 'Phone Call'
  ).length;

  // ═══ Count demos/presentations (Video Call follow-ups) ═══
  const demos = todayFollowups.filter(f =>
    f.mode === 'Video Call' || f.mode === 'In-Person Meeting'
  ).length;

  // ═══ New leads created today ═══
  const newLeads = myLeads.filter(l =>
    l.createdAt?.startsWith(localDate)
  ).length;

  // ═══ Deals in pipeline (active leads, not Closed/Lost/Rejected) ═══
  const dealsInPipeline = myLeads.filter(l =>
    !['Closed', 'Lost', 'Rejected'].includes(l.status)
  ).length;

  // ═══ Revenue closed today (from approved Deal Closed submissions) ═══
  const todayRevenue = mySubmissions
    .filter(s =>
      s.formType === 'Deal Closed' &&
      s.status === 'Approved' &&
      s.submittedAt?.startsWith(localDate)
    )
    .reduce((sum, s) => sum + (Number(s.data?.dealValue) || 0), 0);

  return NextResponse.json({
    autofill: {
      date: localDate,
      totalCalls,
      totalEmails: todayEmails.length,
      demos,
      newLeads,
      followUps: todayFollowups.length,
      dealsInPipeline,
      revenue: todayRevenue,
    },
    // Breakdown for transparency — admin can compare
    breakdown: {
      emails: todayEmails.map(e => ({ to: e.toName || e.to, subject: e.subject, sentAt: e.sentAt })),
      followups: todayFollowups.map(f => ({ mode: f.mode, client: f.clientName, response: f.clientResponse })),
      newLeadNames: myLeads.filter(l => l.createdAt?.startsWith(localDate)).map(l => l.companyName),
    },
  });
}
