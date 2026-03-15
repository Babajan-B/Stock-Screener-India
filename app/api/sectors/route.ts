import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';
import { SECTOR_DEFINITIONS, SECTOR_MAP } from '@/lib/sectorStocks';

function buildStockItem(symbol: string, quote: Record<string, unknown>, fallbackSector: string) {
  return {
    symbol,
    exchange: 'NSE',
    ticker: `${symbol}.NS`,
    company_name: (quote.longName as string) || (quote.shortName as string) || symbol,
    last_price: (quote.regularMarketPrice as number) ?? 0,
    change: (quote.regularMarketChange as number) ?? 0,
    percent_change: (quote.regularMarketChangePercent as number) ?? 0,
    year_high: (quote.fiftyTwoWeekHigh as number) ?? 0,
    year_low: (quote.fiftyTwoWeekLow as number) ?? 0,
    volume: (quote.regularMarketVolume as number) ?? 0,
    market_cap: (quote.marketCap as number) ?? 0,
    pe_ratio: (quote.trailingPE as number) ?? 0,
    sector: fallbackSector,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectorParam = searchParams.get('sector');

  if (!sectorParam) {
    return NextResponse.json({
      status: 'success',
      sectors: SECTOR_DEFINITIONS.map((sector) => ({
        slug: sector.slug,
        name: sector.name,
        description: sector.description,
        count: sector.symbols.length,
        accent: sector.accent,
      })),
    });
  }

  const sector = SECTOR_MAP[sectorParam];
  if (!sector) {
    return NextResponse.json({ status: 'error', message: 'Unknown sector' }, { status: 404 });
  }

  const results = await Promise.allSettled(
    sector.symbols.map((symbol) => yf.quote(`${symbol}.NS`))
  );

  const stocks = results
    .map((result, index) => {
      if (result.status === 'rejected') return null;
      const symbol = sector.symbols[index];
      return buildStockItem(symbol, result.value as Record<string, unknown>, sector.name);
    })
    .filter((stock): stock is ReturnType<typeof buildStockItem> => stock !== null);

  const gainers = stocks.filter((stock) => stock.percent_change > 0).length;
  const losers = stocks.filter((stock) => stock.percent_change < 0).length;
  const topMover = stocks.length
    ? [...stocks].sort((a, b) => Math.abs(b.percent_change) - Math.abs(a.percent_change))[0]
    : null;

  return NextResponse.json({
    status: 'success',
    sector: {
      slug: sector.slug,
      name: sector.name,
      description: sector.description,
      accent: sector.accent,
    },
    stocks,
    stats: {
      total: stocks.length,
      gainers,
      losers,
      topMover: topMover
        ? {
            symbol: topMover.symbol,
            percent_change: topMover.percent_change,
            last_price: topMover.last_price,
          }
        : null,
    },
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  });
}
