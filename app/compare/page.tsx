'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import { formatINR, formatMarketCap } from '@/lib/types';
import { ArrowLeftRight, Plus, X } from 'lucide-react';

const COMPARE_PRESETS = [
  ['RELIANCE', 'ONGC'],
  ['TCS', 'INFY'],
  ['HDFCBANK', 'ICICIBANK'],
  ['SUNPHARMA', 'CIPLA'],
];

interface CompareResult {
  symbol: string;
  company_name: string;
  exchange: string;
  last_price: number;
  percent_change: number;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  sector: string;
  industry: string;
  return_on_equity: number | null;
  debt_to_equity: number | null;
  revenue_growth: number | null;
  free_cash_flow: number | null;
  book_value: number;
  eps: number;
  drop_from_high: number;
  passCount: number;
  totalChecks: number;
  advancedPassCount: number;
  advancedTotalChecks: number;
}

function formatPercent(value: number | null, scale = 1) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return `${(value * scale).toFixed(1)}%`;
}

function formatCurrencyCompact(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `₹${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  return `₹${value.toFixed(0)}`;
}

export default function ComparePage() {
  const [symbols, setSymbols] = useState(['RELIANCE', 'TCS']);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedSymbols = useMemo(
    () => symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
    [symbols]
  );

  const loadComparison = async (nextSymbols: string[]) => {
    const cleanedSymbols = nextSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
    if (cleanedSymbols.length < 2) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/compare?symbols=${encodeURIComponent(cleanedSymbols.join(','))}`);
      const data = await res.json();
      if (data.status !== 'success') {
        setError(data.message || 'Compare request failed.');
        return;
      }
      setResults(data.results || []);
    } catch {
      setError('Failed to compare stocks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runCompare = async () => {
    await loadComparison(symbols);
  };

  const metricRows = [
    { label: 'Current Price', render: (item: CompareResult) => formatINR(item.last_price) },
    { label: 'Today %', render: (item: CompareResult) => `${item.percent_change >= 0 ? '+' : ''}${item.percent_change.toFixed(2)}%` },
    { label: 'Market Cap', render: (item: CompareResult) => formatMarketCap(item.market_cap) },
    { label: 'P/E Ratio', render: (item: CompareResult) => item.pe_ratio ? `${item.pe_ratio.toFixed(2)}x` : 'N/A' },
    { label: 'Dividend Yield', render: (item: CompareResult) => item.dividend_yield ? `${(item.dividend_yield * 100).toFixed(2)}%` : 'N/A' },
    { label: 'ROE', render: (item: CompareResult) => formatPercent(item.return_on_equity, 100) },
    { label: 'Debt / Equity', render: (item: CompareResult) => item.debt_to_equity !== null ? `${item.debt_to_equity.toFixed(2)}` : 'N/A' },
    { label: 'Revenue Growth', render: (item: CompareResult) => formatPercent(item.revenue_growth, 100) },
    { label: 'Free Cash Flow', render: (item: CompareResult) => formatCurrencyCompact(item.free_cash_flow) },
    { label: 'EPS', render: (item: CompareResult) => item.eps ? formatINR(item.eps) : 'N/A' },
    { label: 'Book Value', render: (item: CompareResult) => item.book_value ? formatINR(item.book_value) : 'N/A' },
    { label: 'Drop from 52W High', render: (item: CompareResult) => `${item.drop_from_high.toFixed(1)}%` },
    { label: 'Core Score', render: (item: CompareResult) => `${item.passCount}/${item.totalChecks}` },
    { label: 'Advanced Score', render: (item: CompareResult) => `${item.advancedPassCount}/${item.advancedTotalChecks}` },
  ];

  useEffect(() => {
    if (results.length === 0) {
      void loadComparison(symbols);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="theme-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="Side-by-side analysis"
          icon={<ArrowLeftRight className="h-4 w-4" />}
          title="Compare Indian stocks"
          accent="Head to Head"
          description="Put two to four names on the same screen so valuation, momentum, and screener quality differences stand out quickly."
          meta="Useful for peers like TCS vs INFY, ICICIBANK vs HDFCBANK, or Reliance vs ONGC."
        />

        <div className="theme-panel rounded-[28px] p-5 mb-8">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {symbols.map((symbol, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={symbol}
                  onChange={(event) => {
                    const next = [...symbols];
                    next[index] = event.target.value.toUpperCase();
                    setSymbols(next);
                  }}
                  placeholder="Enter symbol"
                  className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: 'rgba(2,6,23,0.72)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#f9fafb',
                  }}
                />
                {symbols.length > 2 && (
                  <button
                    onClick={() => setSymbols((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-xl border border-white/10 px-3"
                    style={{ color: '#ef4444' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {symbols.length < 4 && (
              <button
                onClick={() => setSymbols((prev) => [...prev, ''])}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium"
                style={{ color: '#f9fafb' }}
              >
                <Plus size={14} />
                Add stock
              </button>
            )}
            <button
              onClick={runCompare}
              disabled={loading || normalizedSymbols.length < 2}
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: '#f97316', color: '#fff', opacity: loading || normalizedSymbols.length < 2 ? 0.6 : 1 }}
            >
              {loading ? 'Comparing...' : 'Compare stocks'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMPARE_PRESETS.map((preset) => (
              <button
                key={preset.join('-')}
                onClick={() => {
                  setSymbols(preset);
                  void loadComparison(preset);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold"
                style={{
                  color: normalizedSymbols.join(',') === preset.join(',') ? '#fbbf24' : '#d1d5db',
                  backgroundColor: normalizedSymbols.join(',') === preset.join(',') ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.05)',
                }}
              >
                {preset.join(' vs ')}
              </button>
            ))}
          </div>
          {error && (
            <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        {!!results.length && (
          <>
            <div className="grid gap-4 mb-8 xl:grid-cols-3">
              {results.map((item) => (
                <div key={item.symbol} className="theme-panel rounded-[28px] p-5">
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                    {item.sector || 'Sector pending'}
                  </p>
                  <h2 className="mt-2 text-2xl font-black" style={{ color: '#f9fafb' }}>
                    {item.symbol}
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
                    {item.company_name}
                  </p>
                  <p className="mt-5 text-3xl font-black" style={{ color: '#f9fafb' }}>
                    {formatINR(item.last_price)}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: item.percent_change >= 0 ? '#22c55e' : '#ef4444' }}>
                    {item.percent_change >= 0 ? '+' : ''}
                    {item.percent_change.toFixed(2)}% today
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p style={{ color: '#6b7280' }}>Core score</p>
                      <p style={{ color: '#f9fafb' }}>{item.passCount}/{item.totalChecks}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280' }}>Advanced score</p>
                      <p style={{ color: '#f9fafb' }}>{item.advancedPassCount}/{item.advancedTotalChecks}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="theme-panel overflow-hidden rounded-[28px]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                        Metric
                      </th>
                      {results.map((item) => (
                        <th
                          key={item.symbol}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: '#6b7280' }}
                        >
                          {item.symbol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows.map((row) => (
                      <tr key={row.label} className="border-t" style={{ borderColor: '#1f2937' }}>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#d1d5db' }}>
                          {row.label}
                        </td>
                        {results.map((item) => (
                          <td key={`${row.label}-${item.symbol}`} className="px-4 py-3 text-sm" style={{ color: '#f9fafb' }}>
                            {row.render(item)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
