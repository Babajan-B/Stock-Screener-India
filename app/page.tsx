'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import StockCard, { StockCardSkeleton } from '@/components/StockCard';
import StockTable, { StockTableSkeleton } from '@/components/StockTable';
import StatCard from '@/components/StatCard';
import { Hero2 } from '@/components/ui/hero-2-1';
import { StockListItem, POPULAR_STOCKS, formatINR } from '@/lib/types';
import { RefreshCw, BarChart2, LayoutGrid, List, TrendingUp, TrendingDown, Activity } from 'lucide-react';

type ViewMode = 'grid' | 'table';
type SortKey = keyof StockListItem;

const BATCH_SIZE = 10;

const SECTORS_PICKS: { [sector: string]: string[] } = {
  'IT': ['TCS', 'INFY', 'WIPRO', 'HCLTECH'],
  'Banking': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK'],
  'Auto': ['MARUTI', 'TATAMOTORS', 'M&M'],
  'Energy': ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID'],
};

export default function HomePage() {
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');

  const fetchStocks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const symbols = POPULAR_STOCKS.slice(0, BATCH_SIZE * 2);
      const chunks: string[][] = [];
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        chunks.push(symbols.slice(i, i + BATCH_SIZE));
      }

      const results = await Promise.all(
        chunks.map(chunk =>
          fetch(`/api/stock/list?symbols=${chunk.join(',')}&res=num`)
            .then(r => r.json())
            .then(data => data.stocks || [])
            .catch(() => [])
        )
      );

      const allStocks: StockListItem[] = results.flat();
      setStocks(allStocks);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Failed to fetch stock data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    // Auto-refresh every 60s
    const interval = setInterval(() => fetchStocks(true), 60000);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  // Sort & filter
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredStocks = stocks.filter(s => {
    if (filter === 'gainers') return s.percent_change > 0;
    if (filter === 'losers') return s.percent_change < 0;
    return true;
  });

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // Stats
  const gainers = stocks.filter(s => s.percent_change > 0).length;
  const losers = stocks.filter(s => s.percent_change < 0).length;
  const topGainer = stocks.reduce<StockListItem | null>((best, s) =>
    !best || s.percent_change > best.percent_change ? s : best, null);
  const topLoser = stocks.reduce<StockListItem | null>((worst, s) =>
    !worst || s.percent_change < worst.percent_change ? s : worst, null);

  return (
    <div className="theme-page">
      <Hero2 />

      <main id="market-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="theme-page-hero theme-panel-strong mb-8 flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-extrabold mb-1" style={{ color: '#f9fafb' }}>
              Live <span style={{ color: '#f97316' }}>Market Dashboard</span>
            </h1>
            <p className="text-sm flex items-center gap-2" style={{ color: '#9ca3af' }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="live-dot w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#22c55e' }} />
                Live data via NSE/BSE
              </span>
              {lastUpdated && (
                <span>· Updated {lastUpdated.toLocaleTimeString('en-IN')}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchStocks(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: refreshing ? '#6b7280' : '#f9fafb',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </motion.div>

        {/* Stats row */}
        {!loading && stocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <StatCard
              label="Gainers"
              value={`${gainers}`}
              sub={`out of ${stocks.length}`}
              accent="#22c55e"
              icon={<TrendingUp size={16} />}
            />
            <StatCard
              label="Losers"
              value={`${losers}`}
              sub={`out of ${stocks.length}`}
              accent="#ef4444"
              icon={<TrendingDown size={16} />}
            />
            {topGainer && (
              <StatCard
                label="Top Gainer"
                value={topGainer.symbol}
                sub={formatINR(topGainer.last_price)}
                trend={topGainer.percent_change}
                accent="#22c55e"
                icon={<Activity size={16} />}
              />
            )}
            {topLoser && (
              <StatCard
                label="Top Loser"
                value={topLoser.symbol}
                sub={formatINR(topLoser.last_price)}
                trend={topLoser.percent_change}
                accent="#ef4444"
                icon={<Activity size={16} />}
              />
            )}
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
          className="theme-panel mb-6 flex flex-col gap-4 rounded-[28px] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(2,6,23,0.5)' }}>
            {(['all', 'gainers', 'losers'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                style={{
                  backgroundColor: filter === f ? (f === 'gainers' ? '#22c55e' : f === 'losers' ? '#ef4444' : '#f97316') : 'transparent',
                  color: filter === f ? '#fff' : '#9ca3af',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(2,6,23,0.5)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-lg transition-all"
              style={{ backgroundColor: viewMode === 'grid' ? '#1f2937' : 'transparent', color: viewMode === 'grid' ? '#f97316' : '#6b7280' }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className="p-2 rounded-lg transition-all"
              style={{ backgroundColor: viewMode === 'table' ? '#1f2937' : 'transparent', color: viewMode === 'table' ? '#f97316' : '#6b7280' }}
            >
              <List size={16} />
            </button>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="theme-panel rounded-[28px] px-5 py-4 mb-6" style={{ borderColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <StockCardSkeleton key={i} />)}
            </div>
          ) : (
            <StockTableSkeleton />
          )
        ) : sortedStocks.length === 0 ? (
          <div className="theme-panel rounded-[28px] text-center py-20">
            <BarChart2 size={48} className="mx-auto mb-4" style={{ color: '#374151' }} />
            <p className="text-lg font-semibold" style={{ color: '#6b7280' }}>No stocks to display</p>
          </div>
        ) : viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {sortedStocks.map(stock => (
              <StockCard key={stock.ticker || stock.symbol} stock={stock} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <StockTable stocks={sortedStocks} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          </motion.div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs mt-10" style={{ color: '#374151' }}>
          Data sourced from NSE/BSE via Yahoo Finance · For informational purposes only · Not for financial advice
        </p>
      </main>
    </div>
  );
}
