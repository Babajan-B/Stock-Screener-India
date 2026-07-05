/**
 * Input sanitisation helpers for API routes.
 *
 * All symbol strings from query params must pass through sanitizeSymbol()
 * before being forwarded to yahoo-finance2.
 */

const MAX_SYMBOL_LENGTH = 20;
// Valid chars: A-Z 0-9 . - ^ & (covers NSE, BSE, index symbols like ^NSEI, M&M)
const VALID_SYMBOL_RE = /^[A-Z0-9.\-^&]+$/;

/**
 * Sanitise a raw symbol query param.
 * Returns the cleaned upper-cased symbol or null if it fails validation.
 */
export function sanitizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().toUpperCase().slice(0, MAX_SYMBOL_LENGTH);
  if (!VALID_SYMBOL_RE.test(clean)) return null;
  return clean;
}

const MAX_SEARCH_QUERY_LENGTH = 60;

/**
 * Sanitise a free-text search query (used in /api/search).
 */
export function sanitizeQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
  if (clean.length < 1) return null;
  return clean;
}

/**
 * Sanitise a comma-separated list of symbols (used in /api/compare, /api/stock/list).
 * Returns an array of valid symbols (may be shorter than input if some are invalid).
 */
export function sanitizeSymbolList(
  raw: string | null | undefined,
  maxCount = 10
): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => sanitizeSymbol(s))
    .filter((s): s is string => s !== null)
    .slice(0, maxCount);
}
