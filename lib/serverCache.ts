/**
 * In-memory server cache with TTL + stale-while-revalidate + in-flight dedupe.
 *
 * - Fresh hit  (< ttlMs):   returned instantly.
 * - Stale hit  (< staleMs): returned instantly; recompute kicks off in background.
 * - Miss:                   compute once; concurrent callers share the same promise.
 *
 * Per-instance only (fine for dev and a warm Vercel lambda). Swap the Map for
 * Upstash Redis if cross-instance caching is ever needed.
 */

interface Entry<T> {
  value: T;
  storedAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export interface CacheResult<T> {
  value: T;
  /** 'fresh' | 'stale' | 'miss' — handy for an X-Cache response header */
  state: 'fresh' | 'stale' | 'miss';
  ageMs: number;
}

export async function cached<T>(
  key: string,
  opts: { ttlMs: number; staleMs?: number },
  compute: () => Promise<T>
): Promise<CacheResult<T>> {
  const { ttlMs, staleMs = ttlMs * 6 } = opts;
  const entry = store.get(key) as Entry<T> | undefined;
  const age = entry ? Date.now() - entry.storedAt : Infinity;

  if (entry && age < ttlMs) {
    return { value: entry.value, state: 'fresh', ageMs: age };
  }

  if (entry && age < staleMs) {
    // Serve stale instantly, refresh in the background (once).
    if (!inFlight.has(key)) {
      const p = compute()
        .then((value) => {
          store.set(key, { value, storedAt: Date.now() });
          return value as unknown;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      p.catch(() => {}); // background refresh failure keeps serving stale
    }
    return { value: entry.value, state: 'stale', ageMs: age };
  }

  // Miss (or too stale): compute, deduping concurrent callers.
  let p = inFlight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = compute()
      .then((value) => {
        store.set(key, { value, storedAt: Date.now() });
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, p as Promise<unknown>);
  }
  const value = await p;
  return { value, state: 'miss', ageMs: 0 };
}

/** Run `fn` over `items` with bounded concurrency, preserving order. */
export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
