import { NextRequest, NextResponse } from 'next/server';
import { consumeOauthState, redirectUri, saveToken } from '@/lib/oauth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');

  if (errorParam) {
    return redirectWithStatus(req, `error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !state) {
    return redirectWithStatus(req, 'error=missing_code');
  }

  const stateRecord = await consumeOauthState(state);
  if (!stateRecord || stateRecord.provider !== 'facebook') {
    return redirectWithStatus(req, 'error=invalid_state');
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return redirectWithStatus(req, 'error=not_configured');
  }

  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri('facebook'),
    code,
  });

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`
  );

  if (!tokenRes.ok) {
    return redirectWithStatus(req, 'error=token_exchange_failed');
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
  };

  const profileRes = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(tokenJson.access_token)}`
  );

  if (!profileRes.ok) {
    return redirectWithStatus(req, 'error=profile_fetch_failed');
  }

  const profile = (await profileRes.json()) as { id: string; name: string };

  await saveToken(stateRecord.uid, {
    provider: 'facebook',
    accessToken: tokenJson.access_token,
    expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined,
    accountId: profile.id,
    displayName: profile.name || 'Facebook account',
    connectedAt: Date.now(),
  });

  return redirectWithStatus(req, 'connected=facebook');
}

function redirectWithStatus(req: NextRequest, query: string): NextResponse {
  const url = new URL('/settings/social', req.url);
  url.search = query;
  return NextResponse.redirect(url);
}
