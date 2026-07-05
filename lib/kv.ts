import { Redis } from '@upstash/redis';

let cached: Redis | null = null;

export function getKv(): Redis {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for social publishing.'
    );
  }
  cached = new Redis({ url, token });
  return cached;
}

export const kvKeys = {
  userToken: (uid: string, provider: string) => `user:${uid}:token:${provider}`,
  userCookies: (uid: string, provider: string) => `user:${uid}:cookies:${provider}`,
  userChannels: (uid: string) => `user:${uid}:channels`,
  userPosts: (uid: string) => `user:${uid}:posts`,
  scheduledPost: (postId: string) => `post:${postId}`,
  scheduledQueue: 'posts:scheduled',
  oauthState: (state: string) => `oauth:state:${state}`,
};

export type StoredToken = {
  provider: 'linkedin' | 'facebook' | 'instagram';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId: string;
  displayName: string;
  connectedAt: number;
};

export type StoredChannel = {
  id: string;
  provider: 'linkedin' | 'facebook' | 'instagram';
  name: string;
  accountId: string;
  isActive: boolean;
};

export type ScheduledPost = {
  id: string;
  userId: string;
  content: string;
  channels: Array<'linkedin' | 'facebook' | 'instagram'>;
  publishAt: number;
  status: 'queued' | 'publishing' | 'published' | 'failed';
  results?: Record<string, { ok: boolean; postUrl?: string; error?: string }>;
  createdAt: number;
};
