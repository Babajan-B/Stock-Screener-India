import { NewsItem, StockResponse } from '@/lib/types';

interface ScreenerPayload {
  status: string;
  symbol: string;
  company_name: string;
  exchange: string;
  last_price: number;
  dropFromHigh: number;
  passCount: number;
  totalChecks: number;
  advancedPassCount?: number;
  advancedTotalChecks?: number;
  checks: Record<string, { value: string; detail: string; pass: boolean | null }>;
}

export function buildStockResearchReport({
  stock,
  screener,
  news,
}: {
  stock: StockResponse;
  screener: ScreenerPayload;
  news: NewsItem[];
}) {
  const d = stock.data;
  const lines = [
    `Stock Research Report: ${stock.symbol} (${stock.exchange})`,
    '',
    `Company: ${d.company_name}`,
    `Sector / Industry: ${d.sector || 'N/A'} / ${d.industry || 'N/A'}`,
    `Current Price: ₹${d.last_price.toFixed(2)}`,
    `Day Change: ${d.change >= 0 ? '+' : ''}${d.change.toFixed(2)} (${d.percent_change.toFixed(2)}%)`,
    `52W Range: ₹${d.year_low.toFixed(2)} to ₹${d.year_high.toFixed(2)}`,
    `Drop From 52W High: ${screener.dropFromHigh.toFixed(2)}%`,
    '',
    'Core Dip Checklist',
    `Score: ${screener.passCount}/${screener.totalChecks}`,
    ...Object.values(screener.checks).map(
      (check) => `- ${check.pass === true ? 'PASS' : check.pass === false ? 'FAIL' : 'N/A'} ${check.value} | ${check.detail}`
    ),
    '',
    'Advanced Quality Layer',
    `Advanced Score: ${screener.advancedPassCount ?? 0}/${screener.advancedTotalChecks ?? 0}`,
    '',
    'Corporate Calendar',
    `Next Earnings: ${formatDate(stock.data.next_earnings_date)}`,
    `Earnings Window: ${formatRange(stock.data.earnings_date_range)}`,
    `Ex-Dividend Date: ${formatDate(stock.data.ex_dividend_date)}`,
    `Dividend Date: ${formatDate(stock.data.dividend_date)}`,
    '',
    'Business Summary',
    d.long_business_summary || 'Not available',
    '',
    'Recent News',
    ...(news.length
      ? news.map(
          (item) =>
            `- ${item.title} | ${item.publisher} | ${new Date(item.published_at).toLocaleDateString('en-IN')} | ${item.link}`
        )
      : ['- No recent news found']),
    '',
    `Generated at ${new Date().toLocaleString('en-IN')}`,
  ];

  return lines.join('\n');
}

function formatDate(value?: string) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-IN');
}

function formatRange(value?: string) {
  if (!value) return 'Not available';
  const [start, end] = value.split('|');
  if (!start || !end) return formatDate(value);
  return `${formatDate(start)} - ${formatDate(end)}`;
}
