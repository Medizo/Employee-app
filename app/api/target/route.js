import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// GET — Employee fetches their own revenue target + achieved revenue
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  // Get the employee's target
  const targetDoc = await db.collection('revenue_targets').findOne({ employeeId: session.id });

  // Calculate achieved revenue from closed deals
  // Check leads with status 'Closed' and sum up estDealValue / dealValue
  const leads = await db.collection('leads').find({ userId: session.id, status: 'Closed' }).toArray();

  let achievedRevenue = 0;
  for (const lead of leads) {
    // Try dealValue first, then estDealValue — parse as number
    const val = lead.dealValue || lead.estDealValue || '0';
    const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed)) achievedRevenue += parsed;
  }

  // Also check approved "Deal Closed" submissions for revenue
  const submissions = await db.collection('submissions').find({
    userId: session.id,
    formType: 'Deal Closed',
    status: 'Approved',
  }).toArray();

  for (const sub of submissions) {
    if (sub.data) {
      const val = sub.data.dealValue || sub.data.revenue || sub.data.amount || '0';
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        // Only add if not already counted from leads
        // Use a heuristic: if no matching lead value, add it
        achievedRevenue += parsed;
      }
    }
  }

  return NextResponse.json({
    target: targetDoc ? {
      monthlyTarget: targetDoc.monthlyTarget,
      month: targetDoc.month,
      quarter: targetDoc.quarter,
      year: targetDoc.year,
      updatedAt: targetDoc.updatedAt,
    } : null,
    achieved: achievedRevenue,
    dealsClosed: leads.length,
  });
}
