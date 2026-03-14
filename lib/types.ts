// Types for the Indian Stock Market API

export interface StockData {
  company_name: string;
  last_price: number;
  change: number;
  percent_change: number;
  previous_close: number;
  open: number;
  day_high: number;
  day_low: number;
  year_high: number;
  year_low: number;
  volume: number;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  book_value: number;
  earnings_per_share: number;
  sector: string;
  industry: string;
  currency: string;
  last_update: string;
  timestamp: string;
}

export interface StockResponse {
  status: string;
  symbol: string;
  exchange: string;
  ticker: string;
  response_format: string;
  data: StockData;
  alternate_exchange?: {
    exchange: string;
    ticker: string;
    api_url: string;
  };
}

export interface StockListItem {
  symbol: string;
  exchange: string;
  ticker: string;
  company_name: string;
  last_price: number;
  change: number;
  percent_change: number;
  volume: number;
  market_cap: number;
  pe_ratio: number;
  sector: string;
}

export interface StockListResponse {
  status: string;
  response_format: string;
  count: number;
  stocks: StockListItem[];
  timestamp: string;
}

export interface SearchResult {
  symbol: string;
  company_name: string;
  match_type: string;
  source: string;
  api_url: string;
  nse_url: string;
  bse_url: string;
}

export interface SearchResponse {
  status: string;
  query: string;
  total_results: number;
  results: SearchResult[];
  timestamp: string;
}

export interface SymbolInfo {
  search_term: string;
  symbol: string;
  nse_ticker: string;
  bse_ticker: string;
  api_url_nse: string;
  api_url_bse: string;
}

export interface SymbolsResponse {
  status: string;
  total_symbols: number;
  symbols: SymbolInfo[];
}

// Popular stocks to show on dashboard
export const POPULAR_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'BHARTIARTL', 'SBIN', 'ITC', 'KOTAKBANK', 'LT',
  'HINDUNILVR', 'BAJFINANCE', 'ASIANPAINT', 'MARUTI', 'TITAN',
  'AXISBANK', 'WIPRO', 'ULTRACEMCO', 'POWERGRID', 'NTPC',
];

export const BASE_API = 'https://military-jobye-haiqstudios-14f59639.koyeb.app';

// Format market cap in Indian style (Crores/Lakhs)
export function formatMarketCap(value: number): string {
  if (!value || isNaN(value)) return 'N/A';
  const crore = value / 1e7;
  if (crore >= 1e5) return `₹${(crore / 1e5).toFixed(2)}L Cr`;
  if (crore >= 1e3) return `₹${(crore / 1e3).toFixed(2)}K Cr`;
  return `₹${crore.toFixed(0)} Cr`;
}

// Format volume
export function formatVolume(value: number): string {
  if (!value || isNaN(value)) return 'N/A';
  const crore = value / 1e7;
  if (crore >= 1) return `${crore.toFixed(2)} Cr`;
  const lakh = value / 1e5;
  if (lakh >= 1) return `${lakh.toFixed(2)} L`;
  return value.toLocaleString('en-IN');
}

// Format number in Indian style
export function formatINR(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function getChangeColor(change: number): string {
  if (change > 0) return '#22c55e';
  if (change < 0) return '#ef4444';
  return '#9ca3af';
}

export function getChangeBg(change: number): string {
  if (change > 0) return 'rgba(34,197,94,0.12)';
  if (change < 0) return 'rgba(239,68,68,0.12)';
  return 'rgba(156,163,175,0.12)';
}
