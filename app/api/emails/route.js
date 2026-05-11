import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { sendEmail } from '@/lib/graph-mail';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const emails = (await readData('emails')).filter(e => e.userId === session.id);
  return NextResponse.json({ emails });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.to)) {
    return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.subject)) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }

  const toEmail = sanitizeString(body.to, 254);
  const toName = sanitizeString(body.toName || '', 200);
  const subject = sanitizeString(body.subject, 200);
  const emailBody = sanitizeString(body.body || '', 10000);

  // ═══ Send via Microsoft Graph API ═══
  let sendResult;
  try {
    sendResult = await sendEmail({
      to: toEmail,
      toName: toName,
      subject: subject,
      body: emailBody,
    });
  } catch (err) {
    console.error('Email send failed:', err);
    sendResult = { success: false, error: err.message };
  }

  // ═══ Log to database regardless of send result ═══
  const emails = await readData('emails');
  const newEmail = {
    id: uuid(),
    userId: session.id,
    senderName: session.name || 'Unknown',
    to: toEmail,
    toName: toName,
    subject: subject,
    body: emailBody,
    template: sanitizeString(body.template || '', 50),
    status: sendResult.success ? 'Delivered' : 'Failed',
    sendError: sendResult.error || null,
    sentAt: new Date().toISOString(),
    sentFrom: process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in',
  };
  emails.push(newEmail);
  await writeData('emails', emails);

  if (!sendResult.success) {
    return NextResponse.json({
      email: newEmail,
      warning: `Email logged but delivery failed: ${sendResult.error}`,
    }, { status: 207 }); // 207 Multi-Status — partial success
  }

  return NextResponse.json({ email: newEmail });
}
