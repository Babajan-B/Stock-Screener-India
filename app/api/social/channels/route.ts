import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/anon-user';
import { deleteToken, listChannels } from '@/lib/oauth';
import type { Provider } from '@/lib/publishers/types';

export async function GET() {
  try {
    const uid = await getServerUserId();
    if (!uid) return NextResponse.json({ channels: [] });
    const channels = await listChannels(uid);
    return NextResponse.json({ channels });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load channels', channels: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const uid = await getServerUserId();
    if (!uid) return NextResponse.json({ error: 'No user' }, { status: 400 });
    const { provider } = (await req.json()) as { provider?: Provider };
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });
    await deleteToken(uid, provider);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
