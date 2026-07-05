import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { buildScreenerAnalysis } from '@/lib/screenerRules';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimiter';
import { sanitizeSymbol } from '@/lib/sanitize';
import { cached } from '@/lib/serverCache';

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { limit: 20, windowMs: 60_000, routeId: 'screener' });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const symbolRaw = sanitizeSymbol(searchParams.get('symbol'));

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  let ticker = symbolRaw;
  const exchange = ticker.endsWith('.BO') ? 'BSE' : 'NSE';
  if (!ticker.endsWith('.NS') && !ticker.endsWith('.BO')) {
    ticker = `${ticker}.NS`;
  }
  const symbol = ticker.replace(/\.(NS|BO)$/, '');

  try {
    const { value: result, state } = await cached(
      `screener:${ticker}`,
      { ttlMs: 60_000, staleMs: 10 * 60_000 },
      async () => {
        const [quoteResult, summaryResult] = await Promise.allSettled([
          yf.quote(ticker),
          yf.quoteSummary(ticker, {
            modules: [
              'financialData',
              'defaultKeyStatistics',
              'incomeStatementHistory',
              'earningsHistory',
              'majorHoldersBreakdown',
              'assetProfile',
            ] as never,
          }),
        ]);

        if (quoteResult.status === 'rejected') {
          throw Object.assign(new Error(`No data found for ${ticker}. Check the symbol and try again.`), { notFound: true });
        }

        return buildScreenerAnalysis({
          symbol,
          ticker,
          exchange,
          quote: quoteResult.value as Record<string, unknown>,
          summary: summaryResult.status === 'fulfilled' ? summaryResult.value as Record<string, unknown> : null,
        });
      }
    );

    return NextResponse.json({
      status: 'success',
      ...result,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60', 'X-Cache': state },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (error && typeof error === 'object' && 'notFound' in error) {
      return NextResponse.json({ status: 'error', message }, { status: 404 });
    }
    return NextResponse.json({
      status: 'error',
      message: `Failed to analyse ${ticker}: ${message}`,
    }, { status: 500 });
  }
}
