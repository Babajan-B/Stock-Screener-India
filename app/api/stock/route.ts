import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = searchParams.get('symbol') || '';

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  // Normalise: if no exchange suffix, default to NSE (.NS)
  let ticker = symbolRaw.toUpperCase();
  const isIndex = ticker.startsWith('^');
  const exchange = isIndex ? 'INDEX' : ticker.endsWith('.BO') ? 'BSE' : 'NSE';
  if (!isIndex && !ticker.endsWith('.NS') && !ticker.endsWith('.BO')) {
    ticker = `${ticker}.NS`;
  }

  const symbol = ticker.replace(/\.(NS|BO)$/, '');

  try {
    const [quote, quoteSummary] = await Promise.allSettled([
      yf.quote(ticker),
      yf.quoteSummary(ticker, {
        modules: ['summaryDetail', 'defaultKeyStatistics', 'assetProfile', 'calendarEvents'],
      }),
    ]);

    if (quote.status === 'rejected') {
      return NextResponse.json({
        status: 'error',
        message: `No data found for symbol: ${ticker}. Stock may not exist or market is closed.`,
        hint: `Try the other exchange: ${symbol}.${exchange === 'NSE' ? 'BO' : 'NS'}`,
      }, { status: 404 });
    }

    const q = quote.value as Record<string, unknown>;
    const sd = quoteSummary.status === 'fulfilled'
      ? (quoteSummary.value?.summaryDetail as Record<string, unknown> | undefined)
      : undefined;
    const ks = quoteSummary.status === 'fulfilled'
      ? (quoteSummary.value?.defaultKeyStatistics as Record<string, unknown> | undefined)
      : undefined;
    const ap = quoteSummary.status === 'fulfilled'
      ? (quoteSummary.value?.assetProfile as Record<string, unknown> | undefined)
      : undefined;
    const ce = quoteSummary.status === 'fulfilled'
      ? (quoteSummary.value?.calendarEvents as Record<string, unknown> | undefined)
      : undefined;
    const earnings = ce?.earnings as Record<string, unknown> | undefined;
    const earningsDates = (earnings?.earningsDate as Date[] | undefined) ?? [];

    const last_price = (q.regularMarketPrice as number) ?? 0;
    const previous_close = (q.regularMarketPreviousClose as number) ?? 0;
    const change = (q.regularMarketChange as number) ?? 0;
    const percent_change = (q.regularMarketChangePercent as number) ?? 0;

    const data = {
      company_name: (q.longName as string) || (q.shortName as string) || symbol,
      last_price,
      change,
      percent_change,
      previous_close,
      open: (q.regularMarketOpen as number) ?? 0,
      day_high: (q.regularMarketDayHigh as number) ?? 0,
      day_low: (q.regularMarketDayLow as number) ?? 0,
      year_high: (q.fiftyTwoWeekHigh as number) ?? 0,
      year_low: (q.fiftyTwoWeekLow as number) ?? 0,
      volume: (q.regularMarketVolume as number) ?? 0,
      market_cap: (q.marketCap as number) ?? 0,
      pe_ratio: (q.trailingPE as number) ?? (sd?.trailingPE as number) ?? 0,
      dividend_yield: (sd?.dividendYield as number)
        ? Number(((sd?.dividendYield as number) * 100).toFixed(2))
        : (q.dividendYield as number) ?? 0,
      book_value: (ks?.bookValue as number) ?? 0,
      earnings_per_share: (q.epsTrailingTwelveMonths as number) ?? 0,
      sector: (ap?.sector as string) ?? '',
      industry: (ap?.industry as string) ?? '',
      ex_dividend_date: ce?.exDividendDate instanceof Date ? ce.exDividendDate.toISOString() : undefined,
      dividend_date: ce?.dividendDate instanceof Date ? ce.dividendDate.toISOString() : undefined,
      next_earnings_date: earningsDates[0] instanceof Date ? earningsDates[0].toISOString() : undefined,
      earnings_date_range: earningsDates.length >= 2
        ? `${earningsDates[0].toISOString()}|${earningsDates[1].toISOString()}`
        : undefined,
      earnings_average: (earnings?.earningsAverage as number) ?? undefined,
      revenue_average: (earnings?.revenueAverage as number) ?? undefined,
      long_business_summary: (ap?.longBusinessSummary as string) ?? '',
      currency: (q.currency as string) ?? 'INR',
      last_update: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    return NextResponse.json({
      status: 'success',
      symbol,
      exchange,
      ticker,
      response_format: 'numeric_only',
      data,
      alternate_exchange: {
        exchange: exchange === 'NSE' ? 'BSE' : 'NSE',
        ticker: `${symbol}.${exchange === 'NSE' ? 'BO' : 'NS'}`,
        api_url: `/api/stock?symbol=${symbol}.${exchange === 'NSE' ? 'BO' : 'NS'}`,
      },
    }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      status: 'error',
      message: `Failed to fetch data for ${ticker}: ${message}`,
    }, { status: 500 });
  }
}
