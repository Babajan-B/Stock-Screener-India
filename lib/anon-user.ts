import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const COOKIE_NAME = 'stockin_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

export async function getServerUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getOrCreateServerUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const uid = randomUUID();
  store.set(COOKIE_NAME, uid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return uid;
}

export const ANON_USER_COOKIE = COOKIE_NAME;
