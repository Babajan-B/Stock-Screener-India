// Singleton yahoo-finance2 instance for all API routes
import YahooFinance from 'yahoo-finance2';

export const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Fetch quotes for many tickers in a single Yahoo request.
 * Returns a Map keyed by ticker; symbols Yahoo rejects are simply absent.
 */
export async function batchQuotes(
  tickers: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (tickers.length === 0) return map;
  try {
    const quotes = (await yf.quote(tickers)) as Array<Record<string, unknown>>;
    for (const q of quotes) {
      if (q && typeof q.symbol === 'string') map.set(q.symbol, q);
    }
  } catch {
    // Whole-batch failure: fall back to individual quotes so one bad
    // symbol can't blank out the entire response.
    const settled = await Promise.allSettled(tickers.map((t) => yf.quote(t)));
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        map.set(tickers[i], r.value as Record<string, unknown>);
      }
    });
  }
  return map;
}
