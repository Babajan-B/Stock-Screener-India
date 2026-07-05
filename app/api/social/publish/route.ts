import { NextResponse } from 'next/server';
import { getOrCreateServerUserId } from '@/lib/anon-user';
import { getPublisher, PublisherError } from '@/lib/publishers';
import type { Provider } from '@/lib/publishers/types';

export async function POST(req: Request) {
  const body = (await req.json()) as {
    content?: string;
    mediaUrl?: string;
    channels?: Provider[];
  };

  if (!body.content || !body.channels || body.channels.length === 0) {
    return NextResponse.json({ error: 'content and channels required' }, { status: 400 });
  }

  const uid = await getOrCreateServerUserId();
  const results: Record<string, { ok: boolean; postUrl?: string; error?: string }> = {};

  for (const provider of body.channels) {
    try {
      const publisher = getPublisher(provider);
      const result = await publisher.publish(uid, body.content, body.mediaUrl);
      results[provider] = { ok: true, postUrl: result.postUrl };
    } catch (err) {
      const message =
        err instanceof PublisherError ? err.message : err instanceof Error ? err.message : 'failed';
      results[provider] = { ok: false, error: message };
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results });
}
