'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { StockListItem, formatINR, formatMarketCap, formatVolume } from '@/lib/types';

interface StockTableProps {
  stocks: StockListItem[];
  sortKey?: keyof StockListItem;
  onSort?: (key: keyof StockListItem) => void;
  sortDir?: 'asc' | 'desc';
}

const columns: { key: keyof StockListItem; label: string; align?: 'left' | 'right' }[] = [
  { key: 'symbol', label: 'Symbol', align: 'left' },
  { key: 'last_price', label: 'LTP (₹)', align: 'right' },
  { key: 'change', label: 'Change (₹)', align: 'right' },
  { key: 'percent_change', label: '% Change', align: 'right' },
  { key: 'market_cap', label: 'Mkt Cap', align: 'right' },
  { key: 'volume', label: 'Volume', align: 'right' },
  { key: 'pe_ratio', label: 'P/E', align: 'right' },
  { key: 'sector', label: 'Sector', align: 'left' },
];

export function StockTableSkeleton() {
  return (
    <div className="theme-panel overflow-hidden rounded-[28px]">
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}>
            {columns.map(c => (
              <th key={c.key} className="px-4 py-3 text-xs font-semibold tracking-wider" style={{ color: '#6b7280' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="border-t" style={{ borderColor: '#1f2937' }}>
              {columns.map(c => (
                <td key={c.key} className="px-4 py-3">
                  <div className="shimmer h-4 rounded" style={{ width: c.align === 'right' ? '60px' : '120px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StockTable({ stocks, sortKey, onSort, sortDir = 'asc' }: StockTableProps) {
  return (
    <div className="theme-panel overflow-hidden rounded-[28px]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {columns.map(c => (
                <th
                  key={c.key}
                  onClick={() => onSort?.(c.key)}
                  className={`px-4 py-3 text-xs font-semibold tracking-wider select-none ${onSort ? 'cursor-pointer hover:text-orange-400' : ''} ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  style={{ color: sortKey === c.key ? '#f97316' : '#6b7280' }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key && (
                      sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, i) => {
              const isUp = stock.change >= 0;
              const isZero = stock.change === 0;
              const changeColor = isZero ? '#9ca3af' : isUp ? '#22c55e' : '#ef4444';

              return (
                <tr
                  key={stock.ticker || stock.symbol + i}
                  className="table-row-hover border-t"
                  style={{ borderColor: '#1f2937' }}
                >
                  <td className="px-4 py-3">
                    <Link href={`/stock/${stock.symbol}`} className="block">
                      <p className="font-bold text-sm" style={{ color: '#f9fafb' }}>{stock.symbol}</p>
                      <p className="text-xs truncate max-w-[140px]" style={{ color: '#6b7280' }}>{stock.company_name}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-sm" style={{ color: '#f9fafb' }}>
                      {formatINR(stock.last_price)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium" style={{ color: changeColor }}>
                      {isUp && !isZero ? '+' : ''}{stock.change?.toFixed(2) ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: isZero ? 'rgba(156,163,175,0.12)' : isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: changeColor,
                      }}
                    >
                      {isZero ? '' : isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {isUp && !isZero ? '+' : ''}{stock.percent_change?.toFixed(2) ?? 'N/A'}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm" style={{ color: '#d1d5db' }}>{formatMarketCap(stock.market_cap)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm" style={{ color: '#d1d5db' }}>{formatVolume(stock.volume)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm" style={{ color: '#d1d5db' }}>{stock.pe_ratio?.toFixed(2) ?? 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}>
                      {stock.sector || 'N/A'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
