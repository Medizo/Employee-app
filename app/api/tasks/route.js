import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ tasks: (await readData('tasks')).filter(t => t.userId === session.id) });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const tasks = await readData('tasks');
  const idx = tasks.findIndex(t => t.id === body.id && t.userId === session.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (body.status) tasks[idx].status = body.status;
  if (body.newComment) {
    if (!tasks[idx].comments) tasks[idx].comments = [];
    tasks[idx].comments.push({ id: uuid(), text: body.newComment, timestamp: new Date().toISOString(), by: session.id });
  }
  if (body.completionProof) tasks[idx].completionProof = body.completionProof;
  await writeData('tasks', tasks);
  return NextResponse.json({ task: tasks[idx] });
}
