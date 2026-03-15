import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { buildScreenerAnalysis } from '@/lib/screenerRules';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = searchParams.get('symbol') || '';

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  let ticker = symbolRaw.toUpperCase();
  const exchange = ticker.endsWith('.BO') ? 'BSE' : 'NSE';
  if (!ticker.endsWith('.NS') && !ticker.endsWith('.BO')) {
    ticker = `${ticker}.NS`;
  }
  const symbol = ticker.replace(/\.(NS|BO)$/, '');

  try {
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
      return NextResponse.json({
        status: 'error',
        message: `No data found for ${ticker}. Check the symbol and try again.`,
      }, { status: 404 });
    }

    const result = buildScreenerAnalysis({
      symbol,
      ticker,
      exchange,
      quote: quoteResult.value as Record<string, unknown>,
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value as Record<string, unknown> : null,
    });

    return NextResponse.json({
      status: 'success',
      ...result,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      message: `Failed to analyse ${ticker}: ${message}`,
    }, { status: 500 });
  }
}
