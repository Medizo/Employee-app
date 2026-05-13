import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, readData } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const users = await readData('users');
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Fetch posts scoped to user's department
  const posts = await db.collection('content_posts')
    .find({ department: currentUser.department })
    .sort({ createdAt: -1 })
    .toArray();

  const safePosts = posts.map(({ _id, ...rest }) => ({ ...rest, _id: _id.toString() }));

  return NextResponse.json({ posts: safePosts, department: currentUser.department });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const users = await readData('users');
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { title, body: postBody, imageUrl, platforms } = body;

  if (!title || !postBody) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  const post = {
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: title.trim(),
    body: postBody.trim(),
    imageUrl: imageUrl || null,
    department: currentUser.department,
    createdBy: currentUser.id,
    createdByName: currentUser.name,
    createdAt: new Date().toISOString(),
    status: 'draft',
    platforms: platforms || ['linkedin', 'twitter'],
    publishedTo: {
      linkedin: { posted: false, postId: null, postedAt: null },
      twitter: { posted: false, tweetId: null, postedAt: null },
    },
  };

  await db.collection('content_posts').insertOne(post);

  return NextResponse.json({ success: true, post });
}

export async function PUT(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const body = await request.json();
  const { id, title, body: postBody, imageUrl, platforms } = body;

  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  const updateFields = {};
  if (title !== undefined) updateFields.title = title.trim();
  if (postBody !== undefined) updateFields.body = postBody.trim();
  if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
  if (platforms !== undefined) updateFields.platforms = platforms;
  updateFields.updatedAt = new Date().toISOString();

  await db.collection('content_posts').updateOne(
    { id },
    { $set: updateFields }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  await db.collection('content_posts').deleteOne({ id });

  return NextResponse.json({ success: true });
}
