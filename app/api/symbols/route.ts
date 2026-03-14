import { NextResponse } from 'next/server';
import { POPULAR_STOCKS } from '@/lib/types';

export async function GET() {
  const symbols = POPULAR_STOCKS.map(sym => ({
    search_term: sym.toLowerCase(),
    symbol: sym,
    nse_ticker: `${sym}.NS`,
    bse_ticker: `${sym}.BO`,
    api_url_nse: `/api/stock?symbol=${sym}.NS`,
    api_url_bse: `/api/stock?symbol=${sym}.BO`,
  }));

  return NextResponse.json({
    status: 'success',
    total_symbols: symbols.length,
    symbols,
  });
}
