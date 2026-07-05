import { NextResponse } from 'next/server';
import { getOrCreateServerUserId } from '@/lib/anon-user';
import { redirectUri, saveOauthState } from '@/lib/oauth';

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: 'FACEBOOK_APP_ID not configured' }, { status: 500 });
  }

  const uid = await getOrCreateServerUserId();
  const state = await saveOauthState(uid, 'facebook');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri('facebook'),
    state,
    scope: 'public_profile,pages_show_list,pages_manage_posts,pages_read_engagement',
    response_type: 'code',
  });

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
