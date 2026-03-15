'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import StockCard, { StockCardSkeleton } from '@/components/StockCard';
import TriggeredAlertsPanel from '@/components/TriggeredAlertsPanel';
import StatCard from '@/components/StatCard';
import { readAlerts } from '@/lib/alertsStorage';
import { StockListItem } from '@/lib/types';
import { Star, Plus, X, RefreshCw, BookMarked, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const DEFAULT_WATCHLIST = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ITC', 'SBIN'];
const STORAGE_KEY = 'stockin_watchlist';

function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function saveWatchlist(list: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'symbol' | 'percent_change' | 'market_cap' | 'last_price'>('percent_change');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [coreScores, setCoreScores] = useState<Record<string, { passCount: number; totalChecks: number }>>({});

  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const fetchStocks = useCallback(async (symbols: string[], isRefresh = false) => {
    if (!symbols.length) {
      setStocks([]);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/stock/list?symbols=${symbols.join(',')}&res=num`);
      const data = await res.json();
      setStocks(data.stocks || []);
      setLastUpdated(new Date());
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchStocks(watchlist);
    } else {
      setLoading(false);
    }
  }, [watchlist, fetchStocks]);

  useEffect(() => {
    async function loadAlertScores() {
      const scoreAlerts = readAlerts().filter(
        (alert) => alert.enabled && alert.kind === 'core_score_at_least'
      );
      const symbols = Array.from(new Set(scoreAlerts.map((alert) => alert.symbol)))
        .filter((symbol) => watchlist.includes(symbol));

      if (!symbols.length) {
        setCoreScores({});
        return;
      }

      const responses = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const res = await fetch(`/api/screener?symbol=${encodeURIComponent(symbol)}`);
            const data = await res.json();
            if (data.status !== 'success') return null;
            return [symbol, { passCount: data.passCount, totalChecks: data.totalChecks }] as const;
          } catch {
            return null;
          }
        })
      );

      const next: Record<string, { passCount: number; totalChecks: number }> = {};
      for (const item of responses) {
        if (!item) continue;
        next[item[0]] = item[1];
      }
      setCoreScores(next);
    }

    loadAlertScores();
  }, [stocks, watchlist]);

  const handleRemove = (symbol: string) => {
    const next = watchlist.filter(s => s !== symbol);
    setWatchlist(next);
    saveWatchlist(next);
    setStocks(prev => prev.filter(s => s.symbol !== symbol));
  };

  const handleAdd = async () => {
    const sym = addInput.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (!sym) return;
    if (watchlist.includes(sym)) {
      setAddError('Already in watchlist');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(sym)}.NS&res=num`);
      const data = await res.json();
      if (data.status !== 'success') {
        setAddError(data.message || 'Stock not found');
        return;
      }
      const next = [...watchlist, sym];
      setWatchlist(next);
      saveWatchlist(next);
      setAddInput('');

      // Add the stock to local state
      const newStock: StockListItem = {
        symbol: data.symbol,
        exchange: data.exchange,
        ticker: data.ticker,
        company_name: data.data.company_name,
        last_price: data.data.last_price,
        change: data.data.change,
        percent_change: data.data.percent_change,
        year_high: data.data.year_high,
        year_low: data.data.year_low,
        volume: data.data.volume,
        market_cap: data.data.market_cap,
        pe_ratio: data.data.pe_ratio,
        sector: data.data.sector,
      };
      setStocks(prev => [...prev, newStock]);
    } catch {
      setAddError('Failed to fetch stock. Check symbol and try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const sectors = useMemo(() => {
    return ['all', ...Array.from(new Set(stocks.map((stock) => stock.sector).filter(Boolean))).sort()];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...stocks]
      .filter((stock) => {
        if (directionFilter === 'gainers' && stock.percent_change <= 0) return false;
        if (directionFilter === 'losers' && stock.percent_change >= 0) return false;
        if (sectorFilter !== 'all' && stock.sector !== sectorFilter) return false;
        if (!query) return true;
        return (
          stock.symbol.toLowerCase().includes(query) ||
          stock.company_name.toLowerCase().includes(query) ||
          stock.sector.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortDir === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [directionFilter, search, sectorFilter, sortDir, sortKey, stocks]);

  const gainers = stocks.filter((stock) => stock.percent_change > 0).length;
  const losers = stocks.filter((stock) => stock.percent_change < 0).length;
  const topMover = stocks.length
    ? [...stocks].sort((a, b) => Math.abs(b.percent_change) - Math.abs(a.percent_change))[0]
    : null;

  return (
    <div className="theme-page">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="Personal workspace"
          icon={<Star className="h-4 w-4" />}
          title="Stay close to your"
          accent="Watchlist"
          description="Track the names you care about most with live price cards, instant refresh, and one-click links into the detailed stock view."
          meta={`Tracking ${watchlist.length} stock${watchlist.length !== 1 ? 's' : ''}${lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString('en-IN')}` : ''}`}
          actions={[
            {
              label: refreshing ? 'Refreshing...' : 'Refresh prices',
              onClick: () => fetchStocks(watchlist, true),
              icon: <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />,
              disabled: refreshing || !watchlist.length,
            },
            {
              label: 'Open screener',
              href: '/screener',
              variant: 'secondary',
            },
          ]}
        />

        {!!stocks.length && (
          <TriggeredAlertsPanel stocks={stocks} coreScores={coreScores} />
        )}

        {!!stocks.length && (
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            <StatCard
              label="Tracked Names"
              value={`${watchlist.length}`}
              sub="Saved in your watchlist"
              accent="#f97316"
              icon={<Star size={16} />}
            />
            <StatCard
              label="Gainers"
              value={`${gainers}`}
              sub="Positive today"
              accent="#22c55e"
              icon={<TrendingUp size={16} />}
            />
            <StatCard
              label="Losers"
              value={`${losers}`}
              sub="Negative today"
              accent="#ef4444"
              icon={<TrendingDown size={16} />}
            />
            <StatCard
              label="Top Mover"
              value={topMover?.symbol ?? 'N/A'}
              sub={topMover ? `${topMover.percent_change >= 0 ? '+' : ''}${topMover.percent_change.toFixed(2)}%` : 'No movement yet'}
              accent="#0ea5e9"
              icon={<Activity size={16} />}
            />
          </div>
        )}

        {/* Add stock */}
        <div className="theme-panel rounded-[28px] p-5 mb-8">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#9ca3af' }}>
            <Plus size={15} />
            Add Stock to Watchlist
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={addInput}
              onChange={e => { setAddInput(e.target.value.toUpperCase()); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Enter symbol (e.g. WIPRO, ONGC)"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border transition-all"
              style={{
                backgroundColor: 'rgba(2,6,23,0.72)',
                borderColor: addError ? '#ef4444' : 'rgba(255,255,255,0.1)',
                color: '#f9fafb',
              }}
            />
            <button
              onClick={handleAdd}
              disabled={addLoading || !addInput.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: '#f97316',
                color: '#fff',
                opacity: addLoading || !addInput.trim() ? 0.6 : 1,
              }}
            >
              {addLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
          {addError && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{addError}</p>}
        </div>

        {!!stocks.length && (
          <div className="theme-panel rounded-[28px] p-5 mb-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Symbol, company, sector"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(2,6,23,0.72)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#f9fafb',
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Move
                </label>
                <select
                  value={directionFilter}
                  onChange={(event) => setDirectionFilter(event.target.value as 'all' | 'gainers' | 'losers')}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: 'rgba(2,6,23,0.72)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#f9fafb',
                  }}
                >
                  <option value="all">All</option>
                  <option value="gainers">Gainers</option>
                  <option value="losers">Losers</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Sector
                </label>
                <select
                  value={sectorFilter}
                  onChange={(event) => setSectorFilter(event.target.value)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: 'rgba(2,6,23,0.72)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#f9fafb',
                  }}
                >
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector === 'all' ? 'All sectors' : sector}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as 'symbol' | 'percent_change' | 'market_cap' | 'last_price')}
                    className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{
                      backgroundColor: 'rgba(2,6,23,0.72)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#f9fafb',
                    }}
                  >
                    <option value="percent_change">Change %</option>
                    <option value="market_cap">Market Cap</option>
                    <option value="last_price">Price</option>
                    <option value="symbol">Symbol</option>
                  </select>
                  <button
                    onClick={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                    style={{
                      backgroundColor: 'rgba(2,6,23,0.72)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#f9fafb',
                    }}
                  >
                    {sortDir === 'desc' ? 'Desc' : 'Asc'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stocks grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: watchlist.length || 4 }).map((_, i) => <StockCardSkeleton key={i} />)}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="theme-panel rounded-[28px] text-center py-20">
            <BookMarked size={48} className="mx-auto mb-4" style={{ color: '#374151' }} />
            <p className="text-lg font-semibold mb-2" style={{ color: '#6b7280' }}>Watchlist is empty</p>
            <p className="text-sm" style={{ color: '#374151' }}>Add stocks above to start tracking them</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="theme-panel rounded-[28px] text-center py-16">
            <BookMarked size={40} className="mx-auto mb-4" style={{ color: '#374151' }} />
            <p className="text-lg font-semibold mb-2" style={{ color: '#6b7280' }}>No stocks match these filters</p>
            <p className="text-sm" style={{ color: '#374151' }}>Adjust search, move, or sector filters to see your saved names.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStocks.map(stock => (
              <div key={stock.symbol} className="relative group">
                <StockCard stock={stock} />
                <button
                  onClick={() => handleRemove(stock.symbol)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}
                  title="Remove from watchlist"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
