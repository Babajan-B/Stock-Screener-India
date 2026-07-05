import { NextRequest, NextResponse } from 'next/server';
import { yf, batchQuotes } from '@/lib/yf';
import { buildScreenerAnalysis } from '@/lib/screenerRules';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimiter';
import { cached, mapConcurrent } from '@/lib/serverCache';

const SUMMARY_MODULES = [
  'financialData',
  'defaultKeyStatistics',
  'incomeStatementHistory',
  'earningsHistory',
  'majorHoldersBreakdown',
  'assetProfile',
] as never;

async function computeCap(symbols: string[]) {
  const tickers = symbols.map((s) => (s.includes('.') ? s : `${s}.NS`));

  // All quotes in one Yahoo request; summaries fanned out with bounded concurrency.
  const quotes = await batchQuotes(tickers);

  const results = await mapConcurrent(symbols, 8, async (symbol, i) => {
    const ticker = tickers[i];
    const quote = quotes.get(ticker);
    if (!quote) return null;
    try {
      const summary = await yf.quoteSummary(ticker, { modules: SUMMARY_MODULES });
      return buildScreenerAnalysis({
        symbol,
        ticker,
        exchange: ticker.endsWith('.BO') ? 'BSE' : 'NSE',
        quote,
        summary: summary as Record<string, unknown>,
      });
    } catch {
      return null;
    }
  });

  return results
    .filter((item): item is NonNullable<(typeof results)[number]> => item !== null)
    .sort((a, b) => {
      const core = b.passCount - a.passCount;
      if (core !== 0) return core;

      const advanced = b.advancedPassCount - a.advancedPassCount;
      if (advanced !== 0) return advanced;

      return Math.abs(b.dropFromHigh) - Math.abs(a.dropFromHigh);
    })
    .slice(0, 20);
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { limit: 10, windowMs: 60_000, routeId: 'top-screener' });
  if (!rl.allowed) return rateLimitResponse(rl);

  const cap = req.nextUrl.searchParams.get('cap') ?? 'large';

  const { LARGE_CAP, MID_CAP, SMALL_CAP, MICRO_CAP } = await import('@/lib/capStocks');
  const pool: Record<string, string[]> = {
    large: LARGE_CAP,
    mid: MID_CAP,
    small: SMALL_CAP,
    micro: MICRO_CAP,
  };
  const symbols = pool[cap] ?? LARGE_CAP;

  const { value, state, ageMs } = await cached(
    `top-screener:${cap}`,
    { ttlMs: 10 * 60_000, staleMs: 60 * 60_000 },
    () => computeCap(symbols)
  );

  return NextResponse.json(
    { status: 'success', cap, results: value },
    {
      headers: {
        'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
        'X-Cache': state,
        'X-Cache-Age': String(Math.round(ageMs / 1000)),
      },
    }
  );
}
