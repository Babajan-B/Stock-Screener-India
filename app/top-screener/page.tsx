'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import { RefreshCw, Trophy, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
interface CheckResult {
  pass: boolean;
  value: string;
}

interface RankedStock {
  symbol:       string;
  company_name: string;
  last_price:   number;
  week52High:   number;
  week52Low:    number;
  dropFromHigh: number;
  marketCap:    number | null;
  sector:       string;
  checks: {
    profitGrowth3Y:      CheckResult;
    opmStable:           CheckResult;
    promoterStakeStable: CheckResult;
    epsIncreasing:       CheckResult;
  };
  passCount:   number;
  totalChecks: number;
}

// ─── constants ────────────────────────────────────────────────────────────────
type Cap = 'large' | 'mid' | 'small' | 'micro';

const CAPS: { key: Cap; label: string; sub: string; color: string; bg: string; border: string }[] = [
  { key: 'large', label: 'Large Cap', sub: 'Nifty 50 / 100',    color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)'  },
  { key: 'mid',   label: 'Mid Cap',   sub: 'Nifty Midcap 150',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)'   },
  { key: 'small', label: 'Small Cap', sub: 'Nifty Smallcap 250',color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)'  },
  { key: 'micro', label: 'Micro Cap', sub: 'Emerging names',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
];

const CHECK_LABELS = ['3Y Profit >15%', 'OPM Stable', 'Promoter >30%', 'EPS Increasing'];
const SCORE_COLOR  = (n: number) => n >= 3 ? '#22c55e' : n === 2 ? '#facc15' : '#ef4444';

function fmtMCap(v: number | null) {
  if (!v) return '—';
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `₹${(v / 1e9).toFixed(1)}B`;
  return `₹${(v / 1e7).toFixed(0)}Cr`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function TopScreenerPage() {
  const [activeCap, setActiveCap]     = useState<Cap>('large');
  const [cache, setCache]             = useState<Partial<Record<Cap, RankedStock[]>>>({});
  const [loading, setLoading]         = useState(false);
  const [lastFetched, setLastFetched] = useState<Partial<Record<Cap, number>>>({});
  const [expanded, setExpanded]       = useState<string | null>(null);

  const capMeta = CAPS.find(c => c.key === activeCap)!;

  const fetchCap = useCallback(async (cap: Cap, force = false) => {
    const STALE_MS = 5 * 60 * 1000; // 5 min cache
    if (!force && cache[cap] && (Date.now() - (lastFetched[cap] ?? 0)) < STALE_MS) return;

    setLoading(true);
    try {
      const res  = await fetch(`/api/top-screener?cap=${cap}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCache(prev  => ({ ...prev,  [cap]: data.results }));
        setLastFetched(prev => ({ ...prev, [cap]: Date.now() }));
      }
    } finally {
      setLoading(false);
    }
  }, [cache, lastFetched]);

  useEffect(() => { fetchCap(activeCap); }, [activeCap]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = cache[activeCap] ?? [];

  return (
    <div className="theme-page" style={{ color: '#f9fafb' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="Cap-wise rankings"
          icon={<Trophy className="h-4 w-4" />}
          title="See the highest scoring"
          accent="Rankings"
          description="Compare large, mid, small, and micro-cap names by screener score and 52-week drawdown so the strongest setups surface faster."
          meta={`${capMeta.label} view${lastFetched[activeCap] ? ` · Refreshed ${new Date(lastFetched[activeCap]!).toLocaleTimeString('en-IN')}` : ''}`}
          actions={[
            {
              label: loading ? 'Refreshing...' : 'Refresh rankings',
              onClick: () => fetchCap(activeCap, true),
              icon: <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />,
              disabled: loading,
            },
            {
              label: 'Open screener',
              href: '/screener',
              variant: 'secondary',
            },
          ]}
        />

        {/* Cap tabs */}
        <div className="theme-panel mb-6 flex flex-wrap gap-2 rounded-[28px] p-3">
          {CAPS.map(cap => (
            <button
              key={cap.key}
              onClick={() => setActiveCap(cap.key)}
              className="flex flex-col items-start px-5 py-3 rounded-2xl border text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeCap === cap.key ? cap.bg   : '#111827',
                borderColor:     activeCap === cap.key ? cap.border : '#1f2937',
                color:           activeCap === cap.key ? cap.color : '#6b7280',
              }}
            >
              <span>{cap.label}</span>
              <span className="text-xs font-normal mt-0.5" style={{ color: activeCap === cap.key ? cap.color : '#4b5563' }}>
                {cap.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && rows.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="theme-panel h-16 rounded-[24px] animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {rows.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs mb-4" style={{ color: '#6b7280' }}>
              <span className="font-semibold" style={{ color: '#4b5563' }}>Checks:</span>
              {CHECK_LABELS.map((l, i) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4b5563' }} />
                  {i + 1}. {l}
                </span>
              ))}
            </div>

            <div className="theme-panel overflow-hidden rounded-[28px]">
              {/* Table header */}
              <div className="grid items-center text-xs font-semibold uppercase tracking-wider px-4 py-3 border-b"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)', borderColor: '#1f2937', color: '#6b7280',
                  gridTemplateColumns: '2rem 1fr 6rem 6rem 6rem 5.5rem 5rem 3rem' }}>
                <span className="text-center">#</span>
                <span>Stock</span>
                <span className="text-right">CMP</span>
                <span className="text-right">Mkt Cap</span>
                <span className="text-right">52W Drop</span>
                <span className="text-center">Checks</span>
                <span className="text-center">Score</span>
                <span />
              </div>

              {/* Rows */}
              {rows.map((s, i) => {
                const isOpen = expanded === s.symbol;
                const checks = [s.checks.profitGrowth3Y, s.checks.opmStable, s.checks.promoterStakeStable, s.checks.epsIncreasing];
                const drop   = Math.abs(s.dropFromHigh);
                const dropColor = drop >= 20 ? '#22c55e' : drop >= 10 ? '#facc15' : '#9ca3af';

                return (
                  <div key={s.symbol} className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: '#1f2937', backgroundColor: i % 2 === 0 ? '#0a0e1a' : 'transparent' }}>

                    {/* Main row */}
                    <div
                      className="grid items-center px-4 py-3.5 cursor-pointer"
                      style={{ gridTemplateColumns: '2rem 1fr 6rem 6rem 6rem 5.5rem 5rem 3rem' }}
                      onClick={() => setExpanded(isOpen ? null : s.symbol)}
                    >
                      {/* Rank */}
                      <div className="text-center">
                        {i < 3
                          ? <span className="text-base">{['🥇','🥈','🥉'][i]}</span>
                          : <span className="text-xs font-bold" style={{ color: '#4b5563' }}>{i + 1}</span>}
                      </div>

                      {/* Stock info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/stock/${s.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm hover:underline shrink-0"
                            style={{ color: capMeta.color }}
                            onClick={e => e.stopPropagation()}
                          >
                            {s.symbol}
                          </a>
                          {s.sector && (
                            <span className="text-xs px-1.5 py-0.5 rounded hidden sm:inline truncate max-w-[130px]"
                              style={{ backgroundColor: '#1f2937', color: '#6b7280' }}>
                              {s.sector}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{s.company_name}</p>
                      </div>

                      {/* CMP */}
                      <div className="text-right font-semibold text-sm" style={{ color: '#f9fafb' }}>
                        ₹{s.last_price.toFixed(2)}
                      </div>

                      {/* Market cap */}
                      <div className="text-right text-xs" style={{ color: '#9ca3af' }}>
                        {fmtMCap(s.marketCap)}
                      </div>

                      {/* 52W drop */}
                      <div className="text-right font-semibold text-sm flex items-center justify-end gap-1" style={{ color: dropColor }}>
                        <TrendingDown size={12} />
                        {s.dropFromHigh.toFixed(1)}%
                      </div>

                      {/* Check dots */}
                      <div className="flex items-center justify-center gap-1.5">
                        {checks.map((c, ci) => (
                          <div key={ci} className="relative group cursor-default shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: c.pass ? '#22c55e' : '#ef4444' }} />
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-20
                              text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none"
                              style={{ backgroundColor: '#1f2937', color: '#f9fafb', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                              {CHECK_LABELS[ci]}: {c.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Score badge */}
                      <div className="flex justify-center">
                        <span className="text-sm font-black px-2 py-0.5 rounded-lg"
                          style={{
                            color:           SCORE_COLOR(s.passCount),
                            backgroundColor: `${SCORE_COLOR(s.passCount)}18`,
                          }}>
                          {s.passCount}/{s.totalChecks}
                        </span>
                      </div>

                      {/* Expand chevron */}
                      <div className="flex justify-end">
                        {isOpen
                          ? <ChevronUp  size={14} style={{ color: '#6b7280' }} />
                          : <ChevronDown size={14} style={{ color: '#4b5563' }} />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="px-4 pb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t"
                        style={{ borderColor: '#1f2937', backgroundColor: 'rgba(15,23,42,0.72)' }}>
                        {checks.map((c, ci) => (
                          <div key={ci} className="rounded-xl p-3 border"
                            style={{
                              backgroundColor: c.pass ? 'rgba(34,197,94,0.06)'  : 'rgba(239,68,68,0.06)',
                              borderColor:     c.pass ? 'rgba(34,197,94,0.2)'   : 'rgba(239,68,68,0.2)',
                            }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: c.pass ? '#22c55e' : '#ef4444' }}>
                              {c.pass ? '✓' : '✗'} {CHECK_LABELS[ci]}
                            </p>
                            <p className="text-sm font-bold" style={{ color: '#f9fafb' }}>{c.value}</p>
                          </div>
                        ))}
                        {/* 52W range */}
                        <div className="sm:col-span-2 lg:col-span-4 rounded-xl p-3 border"
                          style={{ backgroundColor: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
                          <div className="flex justify-between text-xs mb-2" style={{ color: '#9ca3af' }}>
                            <span>52W Low  <strong style={{ color: '#f9fafb' }}>₹{s.week52Low?.toFixed(2)}</strong></span>
                            <span className="font-semibold" style={{ color: '#6366f1' }}>
                              Current ₹{s.last_price.toFixed(2)} ({s.dropFromHigh.toFixed(1)}% from high)
                            </span>
                            <span>52W High <strong style={{ color: '#f9fafb' }}>₹{s.week52High?.toFixed(2)}</strong></span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1f2937' }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${((s.last_price - s.week52Low) / (s.week52High - s.week52Low)) * 100}%`,
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                              }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs mt-4 text-center" style={{ color: '#374151' }}>
              Rankings based on 4-parameter screener score, then by drop from 52-week high.
              Data from Yahoo Finance — for informational purposes only, not investment advice.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
