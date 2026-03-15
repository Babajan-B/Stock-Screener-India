import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = searchParams.get('symbol') || '';

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  const symbol = symbolRaw.toUpperCase().replace(/\.(NS|BO)$/i, '');

  try {
    const results = await yf.search(symbol, {
      quotesCount: 1,
      newsCount: 8,
      enableFuzzyQuery: false,
    });

    const news = (results.news || [])
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

    return NextResponse.json({
      status: 'success',
      symbol,
      news,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      message: `Failed to fetch news for ${symbol}: ${message}`,
    }, { status: 500 });
  }
}
