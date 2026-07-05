import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getOrCreateServerUserId } from '@/lib/anon-user';
import { getKv, kvKeys, ScheduledPost } from '@/lib/kv';
import type { Provider } from '@/lib/publishers/types';

export async function POST(req: Request) {
  const body = (await req.json()) as {
    content?: string;
    channels?: Provider[];
    publishAt?: string | number;
  };

  if (!body.content || !body.channels || body.channels.length === 0 || !body.publishAt) {
    return NextResponse.json(
      { error: 'content, channels, and publishAt are required' },
      { status: 400 }
    );
  }

  const when = typeof body.publishAt === 'number' ? body.publishAt : Date.parse(body.publishAt);
  if (!Number.isFinite(when) || when <= Date.now()) {
    return NextResponse.json({ error: 'publishAt must be in the future' }, { status: 400 });
  }

  const uid = await getOrCreateServerUserId();
  const post: ScheduledPost = {
    id: randomUUID(),
    userId: uid,
    content: body.content,
    channels: body.channels,
    publishAt: when,
    status: 'queued',
    createdAt: Date.now(),
  };

  const kv = getKv();
  await kv.set(kvKeys.scheduledPost(post.id), post);
  await kv.zadd(kvKeys.scheduledQueue, { score: when, member: post.id });
  await kv.lpush(kvKeys.userPosts(uid), post.id);

  return NextResponse.json({ ok: true, post });
}

export async function GET() {
  const uid = await getOrCreateServerUserId();
  const kv = getKv();
  const ids = await kv.lrange<string>(kvKeys.userPosts(uid), 0, 49);
  if (ids.length === 0) return NextResponse.json({ posts: [] });

  const posts = await Promise.all(
    ids.map(async (id) => kv.get<ScheduledPost>(kvKeys.scheduledPost(id)))
  );
  return NextResponse.json({ posts: posts.filter(Boolean) });
}
