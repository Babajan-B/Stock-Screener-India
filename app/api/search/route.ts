import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimiter';
import { sanitizeQuery } from '@/lib/sanitize';
import { cached } from '@/lib/serverCache';

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { limit: 60, windowMs: 60_000, routeId: 'search' });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const q = sanitizeQuery(searchParams.get('q'));

  if (!q) {
    return NextResponse.json({ status: 'error', message: 'q is required' }, { status: 400 });
  }

  try {
    const { value: quotes, state } = await cached(
      `search:${q.toLowerCase()}`,
      { ttlMs: 10 * 60_000, staleMs: 60 * 60_000 },
      async () => {
        const results = await yf.search(q, { newsCount: 0 });
        return (results.quotes ?? [])
      .filter((r: Record<string, unknown>) =>
        (r.exchange === 'NSE' || r.exchange === 'BSI' || r.exchange === 'BSE' ||
          String(r.symbol).endsWith('.NS') || String(r.symbol).endsWith('.BO'))
      )
      .slice(0, 10)
      .map((r: Record<string, unknown>) => {
        const symbol = String(r.symbol || '')
          .replace(/\.(NS|BO)$/i, '')
          .toUpperCase();
        return {
          symbol,
          company_name: (r.longname as string) || (r.shortname as string) || symbol,
          match_type: 'search',
          source: 'yahoo',
          api_url: `/api/stock?symbol=${symbol}`,
          nse_url: `/api/stock?symbol=${symbol}.NS`,
          bse_url: `/api/stock?symbol=${symbol}.BO`,
        };
      });
      }
    );

    return NextResponse.json({
      status: 'success',
      query: q,
      total_results: quotes.length,
      results: quotes,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300', 'X-Cache': state },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      status: 'error',
      message: `Search failed: ${message}`,
    }, { status: 500 });
  }
}
