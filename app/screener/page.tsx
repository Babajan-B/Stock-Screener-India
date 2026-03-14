'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import { formatINR } from '@/lib/types';
import {
  CheckCircle2, XCircle, HelpCircle, TrendingDown, TrendingUp,
  Search, ChevronRight, AlertTriangle, BarChart3, Briefcase,
  TrendingUp as TrendUp, DollarSign, RefreshCw, Info, X
} from 'lucide-react';
import Link from 'next/link';

interface SearchSuggestion {
  symbol: string;
  company_name: string;
}

interface CheckResult {
  pass: boolean | null;
  label: string;
  detail: string;
  value: string;
}

interface ScreenerResult {
  status: string;
  symbol: string;
  ticker: string;
  exchange: string;
  company_name: string;
  last_price: number;
  week52High: number;
  week52Low: number;
  dropFromHigh: number;
  change: number;
  percent_change: number;
  sector: string;
  industry: string;
  checks: {
    profitGrowth3Y: CheckResult;
    opmStable: CheckResult;
    promoterStakeStable: CheckResult;
    epsIncreasing: CheckResult;
  };
  passCount: number;
  totalChecks: number;
  timestamp: string;
  message?: string;
}

const SUGGESTED_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ITC',
  'ICICIBANK', 'SBIN', 'WIPRO', 'BAJFINANCE', 'TITAN',
];

const CHECK_ICONS = {
  profitGrowth3Y: <BarChart3 size={18} />,
  opmStable: <Briefcase size={18} />,
  promoterStakeStable: <DollarSign size={18} />,
  epsIncreasing: <TrendUp size={18} />,
};

const CHECK_DESCRIPTIONS = {
  profitGrowth3Y: '3-year net income CAGR should be above 15%, indicating strong and consistent earnings growth',
  opmStable: 'Operating Profit Margin should be stable (low variance), showing pricing power and cost discipline',
  promoterStakeStable: 'Promoter/insider holding should be meaningful (>30%), showing confidence in the business',
  epsIncreasing: 'Earnings Per Share should show an increasing trend across recent quarters',
};

function CheckCard({ id, check, expanded, onToggle }: {
  id: string;
  check: CheckResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const passState = check.pass === null ? 'unknown' : check.pass ? 'pass' : 'fail';

  const colors = {
    pass:    { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   icon: '#22c55e', badge: 'rgba(34,197,94,0.15)' },
    fail:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   icon: '#ef4444', badge: 'rgba(239,68,68,0.15)' },
    unknown: { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)',   icon: '#eab308', badge: 'rgba(234,179,8,0.15)' },
  };

  const c = colors[passState];
  const num = { profitGrowth3Y: 1, opmStable: 2, promoterStakeStable: 3, epsIncreasing: 4 }[id] || 0;

  return (
    <div
      className="rounded-[28px] border transition-all overflow-hidden"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Number badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
          style={{ backgroundColor: c.badge, color: c.icon }}
        >
          {num}
        </div>

        {/* Icon */}
        <div style={{ color: c.icon }}>
          {CHECK_ICONS[id as keyof typeof CHECK_ICONS]}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: '#f9fafb' }}>{check.label}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{check.value}</p>
        </div>

        {/* Pass/Fail indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {passState === 'pass' && (
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(34,197,94,0.18)', color: '#22c55e' }}>
              <CheckCircle2 size={13} /> PASS
            </span>
          )}
          {passState === 'fail' && (
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}>
              <XCircle size={13} /> FAIL
            </span>
          )}
          {passState === 'unknown' && (
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(234,179,8,0.18)', color: '#eab308' }}>
              <HelpCircle size={13} /> N/A
            </span>
          )}
          <ChevronRight
            size={16}
            style={{ color: '#6b7280', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t" style={{ borderColor: c.border }}>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: '#d1d5db' }}>
            {check.detail}
          </p>
          <p className="text-xs mt-2 italic" style={{ color: '#6b7280' }}>
            {CHECK_DESCRIPTIONS[id as keyof typeof CHECK_DESCRIPTIONS]}
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ pass, total }: { pass: number; total: number }) {
  const pct = total > 0 ? (pass / total) * 100 : 0;
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
  const label = pct >= 75 ? 'Strong Buy Candidate' : pct >= 50 ? 'Moderate — Verify More' : 'Risky — Avoid for Now';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl border-4"
        style={{ borderColor: color, color }}
      >
        {pass}/{total}
      </div>
      <p className="text-xs font-semibold text-center" style={{ color }}>{label}</p>
    </div>
  );
}

export default function ScreenerPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = input.trim();
    if (q.length < 2) { setSuggestions([]); setDropdownOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const raw: SearchSuggestion[] = data.results || [];
        const seen = new Set<string>();
        const unique = raw.filter(r => {
          if (seen.has(r.symbol)) return false;
          seen.add(r.symbol);
          return true;
        });
        setSuggestions(unique.slice(0, 8));
        setDropdownOpen(unique.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSugLoading(false);
      }
    }, 300);
  }, [input]);

  const analyseStock = useCallback(async (sym: string) => {
    const s = sym.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
    if (!s) return;
    setLoading(true);
    setError('');
    setResult(null);
    setExpanded({});
    setSuggestions([]);
    setDropdownOpen(false);
    try {
      const res = await fetch(`/api/screener?symbol=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (data.status !== 'success') {
        setError(data.message || 'Stock not found. Check the symbol and try again.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSuggestion = (sym: string, name: string) => {
    setInput(sym);
    setDropdownOpen(false);
    setSuggestions([]);
    analyseStock(sym);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checkOrder = ['profitGrowth3Y', 'opmStable', 'promoterStakeStable', 'epsIncreasing'] as const;

  const isUp = result ? result.percent_change >= 0 : false;
  const dropColor = result
    ? result.dropFromHigh <= -30 ? '#ef4444' : result.dropFromHigh <= -15 ? '#eab308' : '#22c55e'
    : '#9ca3af';

  return (
    <div className="theme-page">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <PageHero
          badge="4-point framework"
          icon={<TrendingDown className="h-4 w-4" />}
          title="Run the stock dip"
          accent="Analyser"
          description="Check whether a falling stock is just cheaper or fundamentally weaker by testing profit growth, margins, promoter confidence, and EPS trend in one flow."
          meta="Designed for names that are roughly 30–40% below their 52-week high"
          actions={[
            {
              label: 'View rankings',
              href: '/top-screener',
            },
            {
              label: 'Back to dashboard',
              href: '/#market-dashboard',
              variant: 'secondary',
            },
          ]}
        />

        <div className="theme-panel mb-8 flex gap-3 rounded-[28px] px-4 py-3">
          <Info size={15} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>
            When a quality stock falls <strong style={{ color: '#f97316' }}>30–40%</strong> from its high,
            check these 4 parameters before buying the dip. All 4 passing = strong buy candidate.
          </p>
        </div>

        {/* Search */}
        <div className="theme-panel rounded-[28px] p-5 mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
            Enter Stock Symbol or Company Name
          </label>
          <div ref={searchRef} className="relative">
            <div className="flex gap-3">
              <div
                className="flex-1 flex items-center gap-2 px-4 rounded-xl border transition-all"
                style={{
                  backgroundColor: 'rgba(2,6,23,0.72)',
                  borderColor: dropdownOpen ? '#f97316' : 'rgba(255,255,255,0.1)',
                  boxShadow: dropdownOpen ? '0 0 0 3px rgba(249,115,22,0.12)' : 'none',
                }}
              >
                <Search size={15} style={{ color: dropdownOpen ? '#f97316' : '#6b7280' }} />
                <input
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value.toUpperCase()); setError(''); }}
                  onFocus={() => { if (suggestions.length > 0) setDropdownOpen(true); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { setDropdownOpen(false); analyseStock(input); }
                    if (e.key === 'Escape') setDropdownOpen(false);
                  }}
                  placeholder="e.g. RELIANCE, Tata Consultancy, INFY..."
                  className="flex-1 bg-transparent py-3 text-sm outline-none"
                  style={{ color: '#f9fafb' }}
                />
                {sugLoading && (
                  <RefreshCw size={13} className="animate-spin shrink-0" style={{ color: '#6b7280' }} />
                )}
                {input && !sugLoading && (
                  <button onClick={() => { setInput(''); setSuggestions([]); setDropdownOpen(false); }}>
                    <X size={14} style={{ color: '#6b7280' }} />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setDropdownOpen(false); analyseStock(input); }}
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  color: '#fff',
                  opacity: loading || !input.trim() ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Analysing...
                  </span>
                ) : 'Analyse'}
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {dropdownOpen && suggestions.length > 0 && (
              <div
                className="theme-panel absolute top-full mt-2 left-0 right-0 rounded-2xl overflow-hidden z-50 shadow-2xl"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.symbol}-${i}`}
                    onMouseDown={e => { e.preventDefault(); selectSuggestion(s.symbol, s.company_name); }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left border-b transition-colors"
                    style={{ borderColor: '#1f2937' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1f2937')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#f9fafb' }}>{s.symbol}</p>
                      <p className="text-xs mt-0.5 truncate max-w-sm" style={{ color: '#9ca3af' }}>{s.company_name}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-semibold shrink-0"
                      style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                    >
                      Analyse →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick picks */}
          <div className="mt-4">
            <p className="text-xs mb-2" style={{ color: '#6b7280' }}>Popular stocks:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_STOCKS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); analyseStock(s); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#374151';
                    (e.currentTarget as HTMLButtonElement).style.color = '#f97316';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1f2937';
                    (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border px-4 py-3 mb-6 flex gap-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
            <XCircle size={15} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="theme-panel rounded-[28px] p-6">
              <div className="flex justify-between mb-4">
                <div>
                  <div className="shimmer h-7 w-36 mb-2" />
                  <div className="shimmer h-4 w-56" />
                </div>
                <div className="shimmer h-20 w-20 rounded-full" />
              </div>
              <div className="shimmer h-4 w-full mt-3" />
            </div>
            {[1,2,3,4].map(i => (
              <div key={i} className="theme-panel rounded-[28px] p-5">
                <div className="flex items-center gap-4">
                  <div className="shimmer w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="shimmer h-4 w-48 mb-2" />
                    <div className="shimmer h-3 w-24" />
                  </div>
                  <div className="shimmer h-7 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Stock hero card */}
            <div className="theme-panel rounded-[28px] p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/stock/${result.symbol}`}
                      className="text-2xl font-extrabold hover:underline"
                      style={{ color: '#f9fafb' }}>
                      {result.symbol}
                    </Link>
                    <span className="text-xs px-2 py-0.5 rounded-lg font-bold"
                      style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                      {result.exchange}
                    </span>
                  </div>
                  <p className="text-sm mb-0.5" style={{ color: '#9ca3af' }}>{result.company_name}</p>
                  {result.sector && (
                    <p className="text-xs" style={{ color: '#6b7280' }}>{result.sector} · {result.industry}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>Current Price</p>
                      <p className="text-xl font-bold" style={{ color: '#f9fafb' }}>
                        {formatINR(result.last_price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>Today</p>
                      <p className="text-sm font-semibold"
                        style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
                        {isUp ? '+' : ''}{result.percent_change.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>52W High</p>
                      <p className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
                        {formatINR(result.week52High)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  {/* Drop from high meter */}
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Drop from 52W High</p>
                    <div
                      className="text-3xl font-extrabold"
                      style={{ color: dropColor }}
                    >
                      {result.dropFromHigh.toFixed(1)}%
                    </div>
                    {result.dropFromHigh <= -30 && result.dropFromHigh >= -45 && (
                      <p className="text-xs mt-1 font-semibold" style={{ color: '#ef4444' }}>
                        📉 In Buy-Dip Zone
                      </p>
                    )}
                    {result.dropFromHigh > -30 && (
                      <p className="text-xs mt-1" style={{ color: '#eab308' }}>
                        Not yet at 30% dip
                      </p>
                    )}
                  </div>

                  {/* Score */}
                  <ScoreRing pass={result.passCount} total={result.totalChecks} />
                </div>
              </div>

              {/* 52W range bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6b7280' }}>
                  <span>52W Low <span style={{ color: '#ef4444' }}>{formatINR(result.week52Low)}</span></span>
                  <span>52W High <span style={{ color: '#22c55e' }}>{formatINR(result.week52High)}</span></span>
                </div>
                <div className="h-2 rounded-full relative overflow-hidden" style={{ backgroundColor: '#1f2937' }}>
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: 0,
                      width: `${Math.min(100, Math.max(0,
                        result.week52High !== result.week52Low
                          ? ((result.last_price - result.week52Low) / (result.week52High - result.week52Low)) * 100
                          : 50
                      ))}%`,
                      background: 'linear-gradient(90deg, #ef4444, #22c55e)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section title */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-px flex-1" style={{ backgroundColor: '#1f2937' }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>
                4-Point Checklist
              </p>
              <div className="h-px flex-1" style={{ backgroundColor: '#1f2937' }} />
            </div>

            {/* Checklist */}
            {checkOrder.map(id => (
              <CheckCard
                key={id}
                id={id}
                check={result.checks[id]}
                expanded={!!expanded[id]}
                onToggle={() => toggleExpand(id)}
              />
            ))}

            {/* Verdict banner */}
            {(() => {
              const pct = result.totalChecks > 0 ? (result.passCount / result.totalChecks) * 100 : 0;
              const inDipZone = result.dropFromHigh <= -30 && result.dropFromHigh >= -50;
              if (pct >= 75 && inDipZone) {
                return (
                  <div className="theme-panel rounded-[28px] px-5 py-4 flex items-start gap-3"
                    style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
                    <CheckCircle2 size={20} style={{ color: '#22c55e' }} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#22c55e' }}>
                        Strong Buy Candidate — All signals align ✅
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                        {result.symbol} is in the 30–40% dip zone ({result.dropFromHigh.toFixed(1)}%) and passes {result.passCount}/{result.totalChecks} fundamental checks. 
                        Consider buying in tranches and verify promoter holding manually.
                      </p>
                    </div>
                  </div>
                );
              }
              if (pct < 50 || !inDipZone) {
                return (
                  <div className="theme-panel rounded-[28px] px-5 py-4 flex items-start gap-3"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                    <XCircle size={20} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#ef4444' }}>
                        {!inDipZone ? 'Not in Dip Zone Yet' : 'Fails Key Checks — Caution'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                        {!inDipZone
                          ? `${result.symbol} is only ${result.dropFromHigh.toFixed(1)}% from its high — wait for a deeper correction before applying this framework.`
                          : `${result.symbol} only passes ${result.passCount}/${result.totalChecks} checks despite the dip. The fundamentals may be deteriorating — not just the price.`
                        }
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="theme-panel rounded-[28px] px-5 py-4 flex items-start gap-3"
                  style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.25)' }}>
                  <AlertTriangle size={20} style={{ color: '#eab308' }} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#eab308' }}>
                      Partial Match — Proceed with Caution ⚠
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                      {result.symbol} passes {result.passCount}/{result.totalChecks} checks. 
                      Dig deeper into the failing criteria and verify promoter holding trend manually before investing.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Disclaimer */}
            <p className="text-xs text-center pb-2" style={{ color: '#374151' }}>
              Data from Yahoo Finance · Not financial advice · Always do your own research
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
