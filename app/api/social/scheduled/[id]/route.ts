import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/anon-user';
import { getKv, kvKeys, ScheduledPost } from '@/lib/kv';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const uid = await getServerUserId();
  if (!uid) return NextResponse.json({ error: 'No user' }, { status: 400 });

  const kv = getKv();
  const post = await kv.get<ScheduledPost>(kvKeys.scheduledPost(id));
  if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (post.userId !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await kv.del(kvKeys.scheduledPost(id));
  await kv.zrem(kvKeys.scheduledQueue, id);
  await kv.lrem(kvKeys.userPosts(uid), 0, id);

  return NextResponse.json({ ok: true });
}
