import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ status: 'error', message: 'symbols is required' }, { status: 400 });
  }

  const rawSymbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  // Build tickers (default NSE)
  const tickers = rawSymbols.map(s =>
    s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO') ? s : `${s}.NS`
  );

  const results = await Promise.allSettled(
    tickers.map(ticker => yf.quote(ticker))
  );

  const stocks = results
    .map((result, i) => {
      if (result.status === 'rejected') return null;
      const q = result.value as Record<string, unknown>;
      const ticker = tickers[i];
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
    .filter(Boolean);

  return NextResponse.json({
    status: 'success',
    response_format: 'numeric_only',
    count: stocks.length,
    stocks,
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  });
}
