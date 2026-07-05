import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimiter';
import { sanitizeSymbol } from '@/lib/sanitize';
import { cached } from '@/lib/serverCache';

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { limit: 30, windowMs: 60_000, routeId: 'news' });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const symbolRaw = sanitizeSymbol(searchParams.get('symbol'));

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  const symbol = symbolRaw.toUpperCase().replace(/\.(NS|BO)$/i, '');

  try {
    const { value: news, state } = await cached(
      `news:${symbol}`,
      { ttlMs: 5 * 60_000, staleMs: 30 * 60_000 },
      async () => {
        const results = await yf.search(symbol, {
          quotesCount: 1,
          newsCount: 8,
          enableFuzzyQuery: false,
        });
        return (results.news || [])
      .filter((item) => {
        const tickers = (item.relatedTickers || []).map((ticker) =>
          String(ticker).replace(/\.(NS|BO)$/i, '').toUpperCase()
        );
        return tickers.length === 0 || tickers.includes(symbol);
      })
      .slice(0, 6)
      .map((item) => ({
        id: item.uuid,
        title: item.title,
        publisher: item.publisher,
        link: item.link,
        published_at: item.providerPublishTime instanceof Date
          ? item.providerPublishTime.toISOString()
          : new Date(item.providerPublishTime as string).toISOString(),
        related_tickers: (item.relatedTickers || []).map((ticker) =>
          String(ticker).replace(/\.(NS|BO)$/i, '').toUpperCase()
        ),
        thumbnail: item.thumbnail?.resolutions?.[0]?.url,
      }));
      }
    );

    return NextResponse.json({
      status: 'success',
      symbol,
      news,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600', 'X-Cache': state },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      message: `Failed to fetch news for ${symbol}: ${message}`,
    }, { status: 500 });
  }
}
