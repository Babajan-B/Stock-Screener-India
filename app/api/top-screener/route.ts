import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { buildScreenerAnalysis } from '@/lib/screenerRules';

async function screenOne(symbol: string) {
  const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`;

  try {
    const [quote, summary] = await Promise.all([
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

    return buildScreenerAnalysis({
      symbol,
      ticker,
      exchange: ticker.endsWith('.BO') ? 'BSE' : 'NSE',
      quote: quote as Record<string, unknown>,
      summary: summary as Record<string, unknown>,
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const cap = req.nextUrl.searchParams.get('cap') ?? 'large';

  const { LARGE_CAP, MID_CAP, SMALL_CAP, MICRO_CAP } = await import('@/lib/capStocks');
  const pool: Record<string, string[]> = {
    large: LARGE_CAP,
    mid: MID_CAP,
    small: SMALL_CAP,
    micro: MICRO_CAP,
  };
  const symbols = pool[cap] ?? LARGE_CAP;

  const BATCH = 5;
  const results: Array<Awaited<ReturnType<typeof screenOne>>> = [];
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = await Promise.all(symbols.slice(i, i + BATCH).map(screenOne));
    results.push(...batch);
  }

  const sorted = results
    .filter((item): item is NonNullable<Awaited<ReturnType<typeof screenOne>>> => item !== null)
    .sort((a, b) => {
      const core = b.passCount - a.passCount;
      if (core !== 0) return core;

      const advanced = b.advancedPassCount - a.advancedPassCount;
      if (advanced !== 0) return advanced;

      return Math.abs(b.dropFromHigh) - Math.abs(a.dropFromHigh);
    });

  return NextResponse.json({
    status: 'success',
    cap,
    results: sorted.slice(0, 20),
  });
}
