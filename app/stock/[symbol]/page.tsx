'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  StockResponse,
  formatINR,
  formatMarketCap,
  formatVolume,
  formatNumber,
  getChangeColor,
} from '@/lib/types';
import {
  TrendingUp, TrendingDown, RefreshCw, ArrowLeft,
  Building2, DollarSign, Activity, BarChart3,
  Calendar, Layers, Zap
} from 'lucide-react';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = decodeURIComponent(params.symbol as string).toUpperCase();

  const [nseData, setNseData] = useState<StockResponse | null>(null);
  const [bseData, setBseData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeExchange, setActiveExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [nseRes, bseRes] = await Promise.all([
        fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}.NS&res=num`).then(r => r.json()),
        fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}.BO&res=num`).then(r => r.json()),
      ]);

      if (nseRes.status === 'success') setNseData(nseRes);
      if (bseRes.status === 'success') setBseData(bseRes);

      if (nseRes.status !== 'success' && bseRes.status !== 'success') {
        setError(nseRes.message || 'Stock not found. Please check the symbol.');
      }
      setLastUpdated(new Date());
    } catch {
      setError('Failed to fetch stock data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeData = activeExchange === 'NSE' ? nseData : bseData;
  const d = activeData?.data;
  const isUp = d ? d.change >= 0 : true;
  const changeColor = d ? getChangeColor(d.change) : '#9ca3af';

  // Day's range bar position (%)
  const rangePercent = d && d.day_high !== d.day_low
    ? ((d.last_price - d.day_low) / (d.day_high - d.day_low)) * 100
    : 50;

  // Year's range bar position
  const yearRangePercent = d && d.year_high !== d.year_low
    ? ((d.last_price - d.year_low) / (d.year_high - d.year_low)) * 100
    : 50;

  return (
    <div className="theme-page">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:text-orange-400"
          style={{ color: '#9ca3af' }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {loading ? (
          <StockDetailSkeleton />
        ) : error ? (
          <div className="theme-panel rounded-[28px] px-6 py-10 text-center">
            <Activity size={40} className="mx-auto mb-4" style={{ color: '#374151' }} />
            <p className="text-lg font-semibold mb-2" style={{ color: '#f9fafb' }}>Stock Not Found</p>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#f97316', color: '#fff' }}
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Exchange tabs */}
            <div className="theme-panel mb-6 flex gap-2 rounded-[28px] p-3">
              {(['NSE', 'BSE'] as const).map(ex => {
                const available = ex === 'NSE' ? !!nseData : !!bseData;
                return (
                  <button
                    key={ex}
                    onClick={() => available && setActiveExchange(ex)}
                    disabled={!available}
                    className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: activeExchange === ex ? (ex === 'NSE' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)') : '#111827',
                      color: !available ? '#374151' : activeExchange === ex ? (ex === 'NSE' ? '#22c55e' : '#f97316') : '#6b7280',
                      border: `1px solid ${activeExchange === ex ? (ex === 'NSE' ? '#22c55e' : '#f97316') : '#1f2937'}`,
                    }}
                  >
                    {ex} {!available && '(N/A)'}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    Updated {lastUpdated.toLocaleTimeString('en-IN')}
                  </span>
                )}
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: refreshing ? '#6b7280' : '#9ca3af' }}
                >
                  <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {d && (
              <>
                {/* Hero Card */}
                <div className="theme-page-hero theme-panel-strong rounded-[32px] p-6 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-extrabold" style={{ color: '#f9fafb' }}>{symbol}</h1>
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: activeExchange === 'NSE' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                            color: activeExchange === 'NSE' ? '#22c55e' : '#f97316',
                          }}
                        >
                          {activeExchange}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#9ca3af' }}>
                          <span className="live-dot w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#22c55e' }} />
                          Live
                        </span>
                      </div>
                      <p className="text-base mb-1" style={{ color: '#9ca3af' }}>{d.company_name}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {d.sector} · {d.industry}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-4xl font-extrabold mb-1" style={{ color: '#f9fafb' }}>
                        {formatINR(d.last_price)}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-base font-semibold" style={{ color: changeColor }}>
                          {isUp ? '+' : ''}{d.change.toFixed(2)}
                        </span>
                        <span
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold"
                          style={{
                            backgroundColor: isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: changeColor,
                          }}
                        >
                          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isUp ? '+' : ''}{d.percent_change.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                        Prev Close: {formatINR(d.previous_close)}
                      </p>
                    </div>
                  </div>

                  {/* Day Range bar */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-2" style={{ color: '#6b7280' }}>
                        <span>Day Low <span style={{ color: '#ef4444' }}>{formatINR(d.day_low)}</span></span>
                        <span>Day High <span style={{ color: '#22c55e' }}>{formatINR(d.day_high)}</span></span>
                      </div>
                      <div className="h-2 rounded-full relative overflow-hidden" style={{ backgroundColor: '#1f2937' }}>
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            left: 0,
                            width: `${Math.min(100, Math.max(0, rangePercent))}%`,
                            background: 'linear-gradient(90deg, #ef4444, #22c55e)',
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-center" style={{ color: '#9ca3af' }}>Today&apos;s Range</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-2" style={{ color: '#6b7280' }}>
                        <span>52W Low <span style={{ color: '#ef4444' }}>{formatINR(d.year_low)}</span></span>
                        <span>52W High <span style={{ color: '#22c55e' }}>{formatINR(d.year_high)}</span></span>
                      </div>
                      <div className="h-2 rounded-full relative overflow-hidden" style={{ backgroundColor: '#1f2937' }}>
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            left: 0,
                            width: `${Math.min(100, Math.max(0, yearRangePercent))}%`,
                            background: 'linear-gradient(90deg, #ef4444, #22c55e)',
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-center" style={{ color: '#9ca3af' }}>52-Week Range</p>
                    </div>
                  </div>
                </div>

                {/* Detail grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Trading Info */}
                  <DetailSection
                    title="Trading Info"
                    icon={<Activity size={16} />}
                    items={[
                      { label: 'Open', value: formatINR(d.open) },
                      { label: 'Previous Close', value: formatINR(d.previous_close) },
                      { label: 'Day High', value: formatINR(d.day_high), color: '#22c55e' },
                      { label: 'Day Low', value: formatINR(d.day_low), color: '#ef4444' },
                      { label: 'Volume', value: formatVolume(d.volume) },
                      { label: 'Last Update', value: d.last_update },
                    ]}
                  />

                  {/* Fundamentals */}
                  <DetailSection
                    title="Fundamentals"
                    icon={<BarChart3 size={16} />}
                    items={[
                      { label: 'Market Cap', value: formatMarketCap(d.market_cap) },
                      { label: 'P/E Ratio', value: d.pe_ratio ? `${d.pe_ratio.toFixed(2)}x` : 'N/A' },
                      { label: 'EPS', value: d.earnings_per_share ? formatINR(d.earnings_per_share) : 'N/A' },
                      { label: 'Book Value', value: d.book_value ? formatINR(d.book_value) : 'N/A' },
                      { label: 'Dividend Yield', value: d.dividend_yield ? `${d.dividend_yield.toFixed(2)}%` : 'N/A' },
                      { label: 'Currency', value: d.currency || 'INR' },
                    ]}
                  />
                </div>

                {/* Sector & Exchange info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <DetailSection
                    title="Company Info"
                    icon={<Building2 size={16} />}
                    items={[
                      { label: 'Company', value: d.company_name },
                      { label: 'Sector', value: d.sector || 'N/A' },
                      { label: 'Industry', value: d.industry || 'N/A' },
                      { label: 'Exchange', value: activeData?.exchange || activeExchange },
                      { label: 'Ticker', value: activeData?.ticker || `${symbol}.${activeExchange === 'NSE' ? 'NS' : 'BO'}` },
                    ]}
                  />

                  {/* 52 Week */}
                  <DetailSection
                    title="52-Week Stats"
                    icon={<Calendar size={16} />}
                    items={[
                      { label: '52W High', value: formatINR(d.year_high), color: '#22c55e' },
                      { label: '52W Low', value: formatINR(d.year_low), color: '#ef4444' },
                      {
                        label: 'From 52W High',
                        value: `${(((d.last_price - d.year_high) / d.year_high) * 100).toFixed(2)}%`,
                        color: '#ef4444',
                      },
                      {
                        label: 'From 52W Low',
                        value: `+${(((d.last_price - d.year_low) / d.year_low) * 100).toFixed(2)}%`,
                        color: '#22c55e',
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="theme-panel overflow-hidden rounded-[28px]">
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: '#1f2937' }}>
        <span style={{ color: '#f97316' }}>{icon}</span>
        <h3 className="font-semibold text-sm" style={{ color: '#f9fafb' }}>{title}</h3>
      </div>
      <div className="divide-y" style={{ borderColor: '#1f2937' }}>
        {items.map(item => (
          <div key={item.label} className="flex justify-between items-center px-5 py-3">
            <span className="text-sm" style={{ color: '#9ca3af' }}>{item.label}</span>
            <span className="text-sm font-semibold text-right max-w-[55%] truncate" style={{ color: item.color || '#f9fafb' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="theme-panel rounded-[28px] p-6">
        <div className="flex justify-between">
          <div>
            <div className="shimmer h-8 w-32 mb-3" />
            <div className="shimmer h-4 w-56 mb-2" />
            <div className="shimmer h-3 w-40" />
          </div>
          <div className="text-right">
            <div className="shimmer h-10 w-36 mb-2" />
            <div className="shimmer h-6 w-24 ml-auto" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="shimmer h-8 rounded-full" />
          <div className="shimmer h-8 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="theme-panel rounded-[28px] p-5">
            <div className="shimmer h-5 w-32 mb-4" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between py-2 border-t" style={{ borderColor: '#1f2937' }}>
                <div className="shimmer h-4 w-24" />
                <div className="shimmer h-4 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
