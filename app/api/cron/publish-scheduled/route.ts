import { NextRequest, NextResponse } from 'next/server';
import { getKv, kvKeys, ScheduledPost } from '@/lib/kv';
import { getPublisher, PublisherError } from '@/lib/publishers';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 });

  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKv();
  const now = Date.now();
  const dueIds = await kv.zrange<string[]>(kvKeys.scheduledQueue, 0, now, {
    byScore: true,
    offset: 0,
    count: 25,
  });

  const processed: Array<{ id: string; ok: boolean; results?: ScheduledPost['results'] }> = [];

  for (const id of dueIds) {
    const post = await kv.get<ScheduledPost>(kvKeys.scheduledPost(id));
    if (!post) {
      await kv.zrem(kvKeys.scheduledQueue, id);
      continue;
    }

    post.status = 'publishing';
    await kv.set(kvKeys.scheduledPost(id), post);

    const results: NonNullable<ScheduledPost['results']> = {};
    for (const provider of post.channels) {
      try {
        const publisher = getPublisher(provider);
        const r = await publisher.publish(post.userId, post.content);
        results[provider] = { ok: true, postUrl: r.postUrl };
      } catch (err) {
        const message =
          err instanceof PublisherError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'failed';
        results[provider] = { ok: false, error: message };
      }
    }

    post.results = results;
    post.status = Object.values(results).every((r) => r.ok) ? 'published' : 'failed';
    await kv.set(kvKeys.scheduledPost(id), post);
    await kv.zrem(kvKeys.scheduledQueue, id);

    processed.push({ id, ok: post.status === 'published', results });
  }

  return NextResponse.json({ processed, count: processed.length });
}
