/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works per serverless function instance. For true multi-region rate limiting,
 * replace the in-memory store with Upstash Redis (@upstash/ratelimit).
 *
 * Usage:
 *   const result = checkRateLimit(req, { limit: 30, windowMs: 60_000 });
 *   if (!result.allowed) return rateLimitResponse(result);
 */

import { NextRequest, NextResponse } from 'next/server';

interface Window {
  count: number;
  windowStart: number;
}

// Store keyed by `${routeId}:${ip}`
const store = new Map<string, Window>();

// Clean up entries older than 5 minutes to prevent unbounded memory growth
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, win] of store.entries()) {
    if (now - win.windowStart > 5 * 60 * 1000) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional key prefix to namespace limits by route */
  routeId?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  maybeCleanup();

  const { limit, windowMs, routeId = 'default' } = options;
  const ip = getClientIp(req);
  const key = `${routeId}:${ip}`;
  const now = Date.now();

  const win = store.get(key);

  if (!win || now - win.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetMs: now + windowMs };
  }

  win.count += 1;
  const remaining = Math.max(0, limit - win.count);
  const resetMs = win.windowStart + windowMs;

  return { allowed: win.count <= limit, remaining, resetMs };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { status: 'error', message: 'Too many requests. Please wait before retrying.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((result.resetMs - Date.now()) / 1000)),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  );
}
