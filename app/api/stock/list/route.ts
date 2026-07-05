import { NextRequest, NextResponse } from 'next/server';
import { batchQuotes } from '@/lib/yf';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimiter';
import { sanitizeSymbolList } from '@/lib/sanitize';
import { cached } from '@/lib/serverCache';

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { limit: 30, windowMs: 60_000, routeId: 'stock-list' });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ status: 'error', message: 'symbols is required' }, { status: 400 });
  }

  const rawSymbols = sanitizeSymbolList(symbolsParam, 25);

  // Build tickers (default NSE)
  const tickers = rawSymbols.map(s =>
    s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO') ? s : `${s}.NS`
  );

  const { value: stocks, state } = await cached(
    `stock-list:${tickers.join(',')}`,
    { ttlMs: 30_000, staleMs: 5 * 60_000 },
    async () => {
      const quotes = await batchQuotes(tickers);
      return tickers
        .map((ticker) => {
          const q = quotes.get(ticker);
          if (!q) return null;
          const exchange = ticker.startsWith('^') ? 'INDEX' : ticker.endsWith('.BO') ? 'BSE' : 'NSE';
          const symbol = ticker.replace(/\.(NS|BO)$/, '');
          return {
            symbol,
            exchange,
            ticker,
            company_name: (q.longName as string) || (q.shortName as string) || symbol,
            last_price: (q.regularMarketPrice as number) ?? 0,
            change: (q.regularMarketChange as number) ?? 0,
            percent_change: (q.regularMarketChangePercent as number) ?? 0,
            year_high: (q.fiftyTwoWeekHigh as number) ?? 0,
            year_low: (q.fiftyTwoWeekLow as number) ?? 0,
            volume: (q.regularMarketVolume as number) ?? 0,
            market_cap: (q.marketCap as number) ?? 0,
            pe_ratio: (q.trailingPE as number) ?? 0,
            sector: '',
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    }
  );

  return NextResponse.json({
    status: 'success',
    response_format: 'numeric_only',
    count: stocks.length,
    stocks,
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60', 'X-Cache': state },
  });
}
