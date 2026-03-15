'use client';

const RECENTLY_VIEWED_KEY = 'stockin_recently_viewed';
const MAX_RECENT = 6;

type RecentSymbol = {
  symbol: string;
  viewedAt: string;
};

export function readRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as RecentSymbol[];
    return parsed.map((item) => item.symbol).filter(Boolean);
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(symbol: string) {
  if (typeof window === 'undefined') return;

  const nextSymbol = symbol.trim().toUpperCase();
  if (!nextSymbol) return;

  const current = readRecentlyViewed()
    .filter((item) => item !== nextSymbol)
    .map((item) => ({ symbol: item, viewedAt: new Date().toISOString() }));

  const next: RecentSymbol[] = [
    { symbol: nextSymbol, viewedAt: new Date().toISOString() },
    ...current,
  ].slice(0, MAX_RECENT);

  window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
}
