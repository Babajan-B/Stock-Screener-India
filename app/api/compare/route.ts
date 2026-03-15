import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { buildScreenerAnalysis } from '@/lib/screenerRules';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ status: 'error', message: 'symbols is required' }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, ''))
    .filter(Boolean)
    .slice(0, 4);

  if (symbols.length < 2) {
    return NextResponse.json({ status: 'error', message: 'Provide at least two symbols' }, { status: 400 });
  }

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const ticker = `${symbol}.NS`;
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
            'summaryDetail',
          ] as never,
        }),
      ]);

      const quoteRecord = quote as Record<string, unknown>;
      const summaryRecord = summary as Record<string, unknown>;
      const analysis = buildScreenerAnalysis({
        symbol,
        ticker,
        exchange: 'NSE',
        quote: quoteRecord,
        summary: summaryRecord,
      });

      const financialData = summaryRecord.financialData as Record<string, unknown> | undefined;
      const keyStats = summaryRecord.defaultKeyStatistics as Record<string, unknown> | undefined;

      return {
        symbol,
        company_name: analysis.company_name,
        exchange: 'NSE',
        last_price: analysis.last_price,
        percent_change: analysis.percent_change,
        market_cap: (quoteRecord.marketCap as number) ?? 0,
        pe_ratio: (quoteRecord.trailingPE as number) ?? 0,
        dividend_yield: ((summaryRecord.summaryDetail as Record<string, unknown> | undefined)?.dividendYield as number) ?? 0,
        sector: analysis.sector,
        industry: analysis.industry,
        return_on_equity: (financialData?.returnOnEquity as number) ?? null,
        debt_to_equity: (financialData?.debtToEquity as number) ?? null,
        revenue_growth: (financialData?.revenueGrowth as number) ?? null,
        free_cash_flow: (financialData?.freeCashflow as number) ?? null,
        book_value: (keyStats?.bookValue as number) ?? 0,
        eps: (quoteRecord.epsTrailingTwelveMonths as number) ?? 0,
        drop_from_high: analysis.dropFromHigh,
        passCount: analysis.passCount,
        totalChecks: analysis.totalChecks,
        advancedPassCount: analysis.advancedPassCount,
        advancedTotalChecks: analysis.advancedTotalChecks,
      };
    })
  );

  return NextResponse.json({
    status: 'success',
    symbols,
    results,
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }, {
    headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' },
  });
}
