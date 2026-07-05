import { randomBytes } from 'crypto';
import { getKv, kvKeys, StoredChannel, StoredToken } from './kv';
import { encryptJson, decryptJson } from './crypto';
import type { Provider } from './publishers/types';

const STATE_TTL_SECONDS = 600;

export function getRedirectBase(): string {
  const base = process.env.OAUTH_REDIRECT_BASE_URL;
  if (!base) throw new Error('OAUTH_REDIRECT_BASE_URL is not set.');
  return base.replace(/\/$/, '');
}

export function redirectUri(provider: Provider): string {
  return `${getRedirectBase()}/api/auth/${provider}/callback`;
}

export async function saveOauthState(uid: string, provider: Provider): Promise<string> {
  const state = randomBytes(24).toString('hex');
  await getKv().set(
    kvKeys.oauthState(state),
    { uid, provider, createdAt: Date.now() },
    { ex: STATE_TTL_SECONDS }
  );
  return state;
}

export async function consumeOauthState(
  state: string
): Promise<{ uid: string; provider: Provider } | null> {
  const kv = getKv();
  const key = kvKeys.oauthState(state);
  const value = await kv.get<{ uid: string; provider: Provider }>(key);
  if (!value) return null;
  await kv.del(key);
  return value;
}

export async function saveToken(uid: string, token: StoredToken): Promise<void> {
  const kv = getKv();
  await kv.set(kvKeys.userToken(uid, token.provider), encryptJson(token));

  const channel: StoredChannel = {
    id: `${token.provider}:${token.accountId}`,
    provider: token.provider,
    name: token.displayName,
    accountId: token.accountId,
    isActive: true,
  };
  await kv.hset(kvKeys.userChannels(uid), { [token.provider]: JSON.stringify(channel) });
}

export async function loadToken(uid: string, provider: Provider): Promise<StoredToken | null> {
  const raw = await getKv().get<string>(kvKeys.userToken(uid, provider));
  if (!raw) return null;
  return decryptJson<StoredToken>(raw);
}

export async function deleteToken(uid: string, provider: Provider): Promise<void> {
  const kv = getKv();
  await kv.del(kvKeys.userToken(uid, provider));
  await kv.hdel(kvKeys.userChannels(uid), provider);
}

export async function listChannels(uid: string): Promise<StoredChannel[]> {
  const raw = await getKv().hgetall<Record<string, string>>(kvKeys.userChannels(uid));
  if (!raw) return [];
  return Object.values(raw).map((v) =>
    typeof v === 'string' ? (JSON.parse(v) as StoredChannel) : (v as StoredChannel)
  );
}
