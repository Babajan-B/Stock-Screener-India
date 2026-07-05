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
  if (!stateRecord || stateRecord.provider !== 'linkedin') {
    return redirectWithStatus(req, 'error=invalid_state');
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithStatus(req, 'error=not_configured');
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri('linkedin'),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    return redirectWithStatus(req, 'error=token_exchange_failed');
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!profileRes.ok) {
    return redirectWithStatus(req, 'error=profile_fetch_failed');
  }

  const profile = (await profileRes.json()) as { sub: string; name?: string; email?: string };

  await saveToken(stateRecord.uid, {
    provider: 'linkedin',
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
    accountId: profile.sub,
    displayName: profile.name || profile.email || 'LinkedIn account',
    connectedAt: Date.now(),
  });

  return redirectWithStatus(req, 'connected=linkedin');
}

function redirectWithStatus(req: NextRequest, query: string): NextResponse {
  const url = new URL('/settings/social', req.url);
  url.search = query;
  return NextResponse.redirect(url);
}
