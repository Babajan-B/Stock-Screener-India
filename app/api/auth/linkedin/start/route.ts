import { NextResponse } from 'next/server';
import { getOrCreateServerUserId } from '@/lib/anon-user';
import { redirectUri, saveOauthState } from '@/lib/oauth';

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID not configured' }, { status: 500 });
  }

  const uid = await getOrCreateServerUserId();
  const state = await saveOauthState(uid, 'linkedin');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri('linkedin'),
    state,
    scope: 'openid profile w_member_social',
  });

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}
