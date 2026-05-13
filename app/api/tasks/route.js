import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData, getDb } from '@/lib/db';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

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

  const tasks = await readData('tasks');
  const idx = tasks.findIndex(t => t.id === body.id && t.userId === session.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.status && isOneOf(body.status, ['Pending', 'In Progress', 'Completed'])) {
    tasks[idx].status = body.status;
  }
  if (body.newComment) {
    if (!tasks[idx].comments) tasks[idx].comments = [];
    tasks[idx].comments.push({
      id: uuid(),
      text: sanitizeString(body.newComment, 1000),
      timestamp: new Date().toISOString(),
      by: session.id,
    });
  }

  // Store completion proof in MongoDB instead of JSON
  if (rawProof && rawProof.startsWith('data:')) {
    try {
      const db = await getDb();
      const base64Part = rawProof.split(',')[1] || rawProof;
      const contentType = rawProof.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
      const ext = contentType.split('/')[1] || 'bin';
      const filename = `completion_proof_${tasks[idx].id}.${ext}`;

      // Upsert: replace any existing proof for this task
      await db.collection('task_attachments').updateOne(
        { taskId: tasks[idx].id, type: 'completion_proof' },
        {
          $set: {
            taskId: tasks[idx].id,
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

      // Set flag in JSON (no base64 blob)
      tasks[idx].hasCompletionProof = true;
      tasks[idx].completionProofName = filename;
      // Remove old inline proof if any
      delete tasks[idx].completionProof;
    } catch (err) {
      console.error('Failed to store completion proof:', err);
      return NextResponse.json({ error: 'Failed to upload proof' }, { status: 500 });
    }
  }

  await writeData('tasks', tasks);
  return NextResponse.json({ task: tasks[idx] });
}
