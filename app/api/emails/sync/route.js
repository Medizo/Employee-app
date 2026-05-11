import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { readInbox, markAsRead } from '@/lib/graph-mail';

/**
 * GET /api/emails/sync
 * Syncs the inbox of indiaops@cluso.in and matches replies to the employees who sent the originals.
 * Returns the replies relevant to the current user.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = await getDb();

    // 1. Get all sent emails from this user to find which lead emails to watch
    const sentEmails = await db.collection('emails').find({ userId: session.id }).toArray();
    const leadEmails = [...new Set(sentEmails.map(e => e.to?.toLowerCase()).filter(Boolean))];

    if (leadEmails.length === 0) {
      return NextResponse.json({ replies: [], unreadCount: 0 });
    }

    // 2. Fetch inbox messages from these lead email addresses
    // Only get messages from the last 30 days to keep it manageable
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const inboxMessages = await readInbox({ fromAddresses: leadEmails, top: 100, since });

    // 3. Upsert replies into the database (avoid duplicates using graphId)
    let newRepliesCount = 0;
    for (const msg of inboxMessages) {
      const existing = await db.collection('email_replies').findOne({ graphId: msg.graphId });
      if (!existing) {
        // Find which employee this reply belongs to — the one who last emailed this lead
        const matchingSent = sentEmails
          .filter(s => s.to?.toLowerCase() === msg.fromEmail.toLowerCase())
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

        const ownerUserId = matchingSent[0]?.userId || session.id;

        await db.collection('email_replies').insertOne({
          graphId: msg.graphId,
          userId: ownerUserId,
          fromEmail: msg.fromEmail,
          fromName: msg.fromName,
          subject: msg.subject,
          bodyPreview: msg.bodyPreview,
          bodyHtml: msg.bodyHtml,
          receivedAt: msg.receivedAt,
          isRead: false, // Unread in our system until user opens it
          conversationId: msg.conversationId,
        });
        newRepliesCount++;
      }
    }

    // 4. Return all replies for this user
    const myReplies = await db.collection('email_replies')
      .find({ userId: session.id })
      .sort({ receivedAt: -1 })
      .toArray();

    const unreadCount = myReplies.filter(r => !r.isRead).length;

    return NextResponse.json({
      replies: myReplies.map(({ _id, ...rest }) => rest),
      unreadCount,
      synced: newRepliesCount,
    });
  } catch (err) {
    console.error('Email sync error:', err);
    return NextResponse.json({ error: 'Failed to sync inbox' }, { status: 500 });
  }
}

/**
 * POST /api/emails/sync
 * Mark a reply as read.
 * Body: { graphId: string }
 */
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { graphId } = await req.json();
    if (!graphId) return NextResponse.json({ error: 'graphId required' }, { status: 400 });

    const db = await getDb();
    await db.collection('email_replies').updateOne(
      { graphId, userId: session.id },
      { $set: { isRead: true } }
    );

    // Also mark as read in Graph API
    await markAsRead(graphId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
