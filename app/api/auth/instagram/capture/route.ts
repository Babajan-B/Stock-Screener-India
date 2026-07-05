import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateServerUserId } from '@/lib/anon-user';
import { encryptJson } from '@/lib/crypto';
import { getKv, kvKeys, StoredChannel } from '@/lib/kv';

export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get('x-service-token');
  if (!process.env.PLAYWRIGHT_SERVICE_TOKEN || serviceToken !== process.env.PLAYWRIGHT_SERVICE_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    userId?: string;
    username?: string;
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
  };

  if (!body.cookies || !Array.isArray(body.cookies) || body.cookies.length === 0) {
    return NextResponse.json({ error: 'cookies required' }, { status: 400 });
  }

  const uid = body.userId || (await getOrCreateServerUserId());
  const displayName = body.username || 'Instagram account';

  const kv = getKv();
  await kv.set(kvKeys.userCookies(uid, 'instagram'), encryptJson(body.cookies));

  const channel: StoredChannel = {
    id: `instagram:${uid}`,
    provider: 'instagram',
    name: displayName,
    accountId: uid,
    isActive: true,
  };
  await kv.hset(kvKeys.userChannels(uid), { instagram: JSON.stringify(channel) });

  return NextResponse.json({ ok: true, userId: uid });
}
