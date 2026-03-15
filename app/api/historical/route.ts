import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';

const RANGE_CONFIG = {
  '1mo': { days: 30, interval: '1d' as const },
  '3mo': { days: 90, interval: '1d' as const },
  '6mo': { days: 180, interval: '1d' as const },
  '1y': { days: 365, interval: '1d' as const },
  '5y': { days: 365 * 5, interval: '1wk' as const },
};

type HistoryRange = keyof typeof RANGE_CONFIG;

function normalizeTicker(symbolRaw: string) {
  const upper = symbolRaw.trim().toUpperCase();
  if (upper.startsWith('^')) {
    return upper;
  }

  if (upper.endsWith('.NS') || upper.endsWith('.BO')) {
    return upper;
  }

  return `${upper}.NS`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = searchParams.get('symbol') || '';
  const range = (searchParams.get('range') || '6mo') as HistoryRange;

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  if (!(range in RANGE_CONFIG)) {
    return NextResponse.json({ status: 'error', message: 'range must be one of: 1mo, 3mo, 6mo, 1y, 5y' }, { status: 400 });
  }

  const ticker = normalizeTicker(symbolRaw);
  const config = RANGE_CONFIG[range];
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - config.days * 24 * 60 * 60 * 1000);

  try {
    const history = await yf.historical(ticker, {
      period1,
      period2,
      interval: config.interval,
    });

    const bars = history
      .filter((row) => typeof row.close === 'number')
      .map((row) => ({
        timestamp: row.date.toISOString(),
        open: Number(row.open ?? 0),
        high: Number(row.high ?? 0),
        low: Number(row.low ?? 0),
        close: Number(row.close ?? 0),
        volume: Number(row.volume ?? 0),
      }));

    return NextResponse.json({
      status: 'success',
      symbol: ticker.replace(/\.(NS|BO)$/, ''),
      ticker,
      range,
      interval: config.interval,
      bars,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      message: `Failed to fetch historical data for ${ticker}: ${message}`,
    }, { status: 500 });
  }
}
