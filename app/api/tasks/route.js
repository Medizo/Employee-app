import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData, getDb } from '@/lib/db';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';
import { sendTaskEmail } from '@/lib/mailer';
import { notifyAdmins } from '@/lib/admin-notify';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = (await readData('tasks')).filter(t => t.userId === session.id);

  // For tasks with completion proof stored in MongoDB, mark them
  try {
    const db = await getDb();
    const proofs = await db.collection('task_attachments').find(
      { taskId: { $in: tasks.map(t => t.id) }, type: 'completion_proof' },
      { projection: { taskId: 1, filename: 1, contentType: 1 } }
    ).toArray();

    const proofMap = {};
    proofs.forEach(p => { proofMap[p.taskId] = p; });

    tasks.forEach(t => {
      if (proofMap[t.taskId || t.id]) {
        t.hasCompletionProof = true;
        t.completionProofName = proofMap[t.taskId || t.id].filename;
        t.completionProofType = proofMap[t.taskId || t.id].contentType;
      }
      // Keep backward compat: if completionProof is already inline (old data)
      if (t.completionProof && t.completionProof.startsWith('data:')) {
        t.hasCompletionProof = true;
      }
    });
  } catch (err) {
    console.error('Failed to load completion proofs:', err);
  }

  return NextResponse.json({ tasks });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Extract completion proof before sanitization (base64 is huge)
  const rawProof = rawBody.completionProof || null;
  delete rawBody.completionProof;
  const body = sanitizeInput(rawBody);

  const db = await getDb();
  const target = await db.collection('tasks').findOne({ id: body.id, userId: session.id });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updateFields = {};
  const updateDoc = {};

  if (body.status && isOneOf(body.status, ['Pending', 'In Progress', 'Completed'])) {
    updateFields.status = body.status;
    if (body.status !== target.status) {
      const logEntry = {
        status: body.status,
        timestamp: new Date().toISOString(),
        by: 'employee',
        userName: session.name || session.email || 'Employee',
        comment: body.newComment || (body.status === 'In Progress' ? 'Task started' : body.status === 'Completed' ? 'Task completed & submitted' : 'Status updated')
      };
      updateDoc.$push = { statusLogs: logEntry };
    }
  }
  
  if (Object.keys(updateFields).length > 0) {
    updateDoc.$set = updateFields;
  }
  
  if (body.newComment) {
    const newComment = {
      id: uuid(),
      text: sanitizeString(body.newComment, 1000),
      timestamp: new Date().toISOString(),
      by: session.id,
    };
    if (!updateDoc.$push) updateDoc.$push = {};
    updateDoc.$push.comments = newComment;
  }

  // Store completion proof in MongoDB instead of JSON
  if (rawProof && rawProof.startsWith('data:')) {
    try {
      const db = await getDb();
      const base64Part = rawProof.split(',')[1] || rawProof;
      const contentType = rawProof.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
      const ext = contentType.split('/')[1] || 'bin';
      const filename = `completion_proof_${target.id}.${ext}`;

      // Upsert: replace any existing proof for this task
      await db.collection('task_attachments').updateOne(
        { taskId: target.id, type: 'completion_proof' },
        {
          $set: {
            taskId: target.id,
            type: 'completion_proof',
            filename,
            contentType,
            base64Data: base64Part,
            sizeBytes: Math.ceil(base64Part.length * 3 / 4),
            uploadedBy: session.id,
            createdAt: new Date().toISOString(),
          }
        },
        { upsert: true }
      );

      // Set flag in MongoDB (no base64 blob)
      if (!updateDoc.$set) updateDoc.$set = {};
      updateDoc.$set.hasCompletionProof = true;
      updateDoc.$set.completionProofName = filename;
      
      if (!updateDoc.$unset) updateDoc.$unset = {};
      updateDoc.$unset.completionProof = "";
    } catch (err) {
      console.error('Failed to store completion proof:', err);
      return NextResponse.json({ error: 'Failed to upload proof' }, { status: 500 });
    }
  }

  if (Object.keys(updateDoc).length > 0) {
    await db.collection('tasks').updateOne({ id: body.id }, updateDoc);
  }

  const updatedTask = await db.collection('tasks').findOne({ id: body.id });

  // If task is completed, send email to admin(s) + notification
  if (body.status === 'Completed') {
    await notifyAdmins({
      type: 'success',
      title: '✅ Task Completed',
      message: `${session.name || 'An employee'} completed: "${target.title}"`,
      link: '/dashboard/tasks',
    });

    try {
      const admins = await db.collection('users').find({ role: { $in: ['System Admin', 'Super Admin'] } }).toArray();
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      
      if (adminEmails.length > 0) {
        let attachmentPayload = undefined;
        
        // If there's a proof newly uploaded or already exists
        if (rawProof && rawProof.startsWith('data:')) {
          const base64Part = rawProof.split(',')[1] || rawProof;
          const contentType = rawProof.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
          const ext = contentType.split('/')[1] || 'bin';
          attachmentPayload = {
            filename: `completion_proof_${target.id}.${ext}`,
            contentType,
            base64Data: base64Part,
          };
        } else if (updatedTask.hasCompletionProof) {
          // If proof was uploaded previously, fetch it from DB
          const existingProof = await db.collection('task_attachments').findOne({ taskId: target.id, type: 'completion_proof' });
          if (existingProof) {
            attachmentPayload = {
              filename: existingProof.filename,
              contentType: existingProof.contentType,
              base64Data: existingProof.base64Data,
            };
          }
        }

        const htmlBody = `
          <div style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 28px 32px; color: #fff;">
              <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">✅ Task Completed</h1>
              <p style="margin: 0; opacity: 0.85; font-size: 14px;">An employee has marked their task as completed.</p>
            </div>
            <div style="padding: 28px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${target.title}</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; width: 120px;">Completed By</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-size: 14px;">${session.name || session.email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">Time</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-size: 14px;">${new Date().toLocaleString('en-IN')}</td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #6b7280; margin: 20px 0 0 0;">Please log in to the Admin Portal to review the completion proof.</p>
            </div>
          </div>
        `;

        // Send email to the first admin (or iterate)
        // Here we can send to all admins, or just the first primary admin.
        for (const email of adminEmails) {
          await sendTaskEmail({
            to: email,
            toName: 'Admin',
            subject: `✅ Task Completed: ${target.title}`,
            htmlBody,
            attachment: attachmentPayload
          });
        }
      }
    } catch (err) {
      console.error('Failed to send completion email:', err);
    }
  }

  return NextResponse.json({ task: updatedTask });
}
