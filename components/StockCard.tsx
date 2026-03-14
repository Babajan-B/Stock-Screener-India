'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StockListItem, formatINR, formatMarketCap, formatVolume } from '@/lib/types';

interface StockCardProps {
  stock: StockListItem;
  loading?: boolean;
}

export function StockCardSkeleton() {
  return (
    <div className="stock-card rounded-2xl border p-5" style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="shimmer h-5 w-20 mb-2" />
          <div className="shimmer h-3 w-32" />
        </div>
        <div className="shimmer h-6 w-16 rounded-full" />
      </div>
      <div className="shimmer h-8 w-28 mb-4" />
      <div className="space-y-2">
        <div className="shimmer h-3 w-full" />
        <div className="shimmer h-3 w-3/4" />
      </div>
    </div>
  );
}

export default function StockCard({ stock }: StockCardProps) {
  const isUp = stock.change >= 0;
  const isZero = stock.change === 0;

  return (
    <Link href={`/stock/${stock.symbol}`}>
      <div
        className="stock-card rounded-2xl border p-5 block"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 mr-2">
            <p className="font-bold text-base truncate" style={{ color: '#f9fafb' }}>{stock.symbol}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }}>{stock.company_name}</p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-lg font-medium shrink-0"
            style={{
              backgroundColor: stock.exchange === 'NSE' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
              color: stock.exchange === 'NSE' ? '#22c55e' : '#f97316',
            }}
          >
            {stock.exchange}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-end gap-3 mb-4">
          <p className="text-2xl font-bold" style={{ color: '#f9fafb' }}>
            {formatINR(stock.last_price)}
          </p>
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1 mb-0.5"
            style={{
              backgroundColor: isZero ? 'rgba(156,163,175,0.12)' : isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: isZero ? '#9ca3af' : isUp ? '#22c55e' : '#ef4444',
            }}
          >
            {isZero ? <Minus size={12} /> : isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span className="text-xs font-semibold">
              {isUp && !isZero ? '+' : ''}{stock.percent_change.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>Mkt Cap</p>
            <p className="text-xs font-medium" style={{ color: '#d1d5db' }}>{formatMarketCap(stock.market_cap)}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>Volume</p>
            <p className="text-xs font-medium" style={{ color: '#d1d5db' }}>{formatVolume(stock.volume)}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>P/E Ratio</p>
            <p className="text-xs font-medium" style={{ color: '#d1d5db' }}>
              {stock.pe_ratio ? stock.pe_ratio.toFixed(2) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>Sector</p>
            <p className="text-xs font-medium truncate" style={{ color: '#d1d5db' }}>{stock.sector || 'N/A'}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
