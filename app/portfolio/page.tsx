'use client';

import { useState, useCallback, useRef, useMemo, DragEvent } from 'react';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import {
  Upload, FileText, Download, RefreshCw,
  CheckCircle2, Briefcase,
} from 'lucide-react';

// ─── types ───────────────────────────────────────────────────────────────────
type Recommendation = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';

interface PortfolioRow {
  symbol: string;
  qty?: number;
  buyPrice?: number;
}

interface ScreenerCheck {
  pass: boolean;
  value: string;
  detail: string;
}

interface ScreenerResult {
  status: string;
  symbol: string;
  company_name: string;
  last_price: number;
  week52High: number;
  week52Low: number;
  dropFromHigh: number;
  checks: {
    profitGrowth3Y: ScreenerCheck;
    opmStable: ScreenerCheck;
    promoterStakeStable: ScreenerCheck;
    epsIncreasing: ScreenerCheck;
  };
  passCount: number;
  totalChecks: number;
}

interface PortfolioResult extends PortfolioRow {
  screener?: ScreenerResult;
  error?: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  recommendation?: Recommendation;
  pnlPct?: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseRow(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[\s_\-()%#]/g, ''));

  return lines.slice(1)
    .map(line => {
      const vals = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { if (h) row[h] = vals[i] ?? ''; });
      return row;
    })
    .filter(row => Object.values(row).some(v => v));
}

function findCol(headers: string[], candidates: string[]): string | undefined {
  return headers.find(h => candidates.some(c => h.includes(c)));
}

function cleanSymbol(raw: string): string {
  return raw
    .replace(/[-:](?:EQ|BE|N1|N2|BL|GR)$/i, '')
    .replace(/\.(?:NS|BO|BSE|NSE)$/i, '')
    .replace(/:(?:NSE|BSE)$/i, '')
    .trim()
    .toUpperCase();
}

function extractRows(text: string): PortfolioRow[] {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]);
  const symbolCol = findCol(headers, ['instrument', 'symbol', 'stock', 'scrip', 'tradingsymbol', 'ticker']);
  const qtyCol    = findCol(headers, ['qty', 'quantity', 'shares', 'units', 'holdingqty']);
  const priceCol  = findCol(headers, ['avgcost', 'averagebuyprice', 'buyprice', 'avgprice', 'averageprice', 'purchaseprice', 'costprice', 'buyingprice']);

  if (!symbolCol) return [];

  return rows
    .map(row => {
      const raw = row[symbolCol];
      if (!raw) return null;
      const symbol = cleanSymbol(raw);
      if (!symbol || symbol.length < 2) return null;

      const qty      = qtyCol    ? parseFloat(row[qtyCol])    : undefined;
      const buyPrice = priceCol  ? parseFloat(row[priceCol])  : undefined;

      return {
        symbol,
        qty:      isNaN(qty as number)      ? undefined : qty,
        buyPrice: isNaN(buyPrice as number) ? undefined : buyPrice,
      } as PortfolioRow;
    })
    .filter(Boolean) as PortfolioRow[];
}

function getRecommendation(s: ScreenerResult): Recommendation {
  const drop = Math.abs(s.dropFromHigh); // positive %, e.g. 35 means down 35%
  if (s.passCount >= 3 && drop >= 20) return 'Strong Buy';
  if (s.passCount >= 2 && drop >= 10) return 'Buy';
  if (s.passCount >= 2)               return 'Hold';
  return 'Sell';
}

const REC: Record<Recommendation, { bg: string; color: string; border: string }> = {
  'Strong Buy': { bg: 'rgba(34,197,94,0.14)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)'  },
  'Buy':        { bg: 'rgba(59,130,246,0.14)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  'Hold':       { bg: 'rgba(234,179,8,0.14)',  color: '#facc15', border: 'rgba(234,179,8,0.3)'  },
  'Sell':       { bg: 'rgba(239,68,68,0.14)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
};

const CHECK_INFO = [
  { key: 'profitGrowth3Y',       label: '3Y Profit >15%' },
  { key: 'opmStable',            label: 'OPM Stable'     },
  { key: 'promoterStakeStable',  label: 'Promoter Stable'},
  { key: 'epsIncreasing',        label: 'EPS Increasing' },
];

const SAMPLE_CSV =
`Instrument,Qty,Avg cost
RELIANCE,10,1450.00
TCS,5,3200.00
HDFCBANK,20,1550.00
INFY,15,1400.00
SBIN,25,620.00`;

const REC_ORDER: Record<string, number> = { 'Strong Buy': 4, 'Buy': 3, 'Hold': 2, 'Sell': 1 };

// ─── component ───────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [results,    setResults]    = useState<PortfolioResult[]>([]);
  const [fileName,   setFileName]   = useState('');
  const [dragging,   setDragging]   = useState(false);
  const [parseError, setParseError] = useState('');
  const [analysing,  setAnalysing]  = useState(false);
  const [sortKey,    setSortKey]    = useState('rec');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('desc');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── file processing ────────────────────────────────────────────────────────
  const processFile = useCallback(async (text: string, name: string) => {
    setParseError('');
    const parsed = extractRows(text);
    if (!parsed.length) {
      setParseError('No stock symbols found. Make sure your CSV has a column named Symbol, Instrument, or Stock.');
      return;
    }

    // deduplicate
    const seen = new Set<string>();
    const unique = parsed.filter(r => { if (seen.has(r.symbol)) return false; seen.add(r.symbol); return true; });

    setFileName(name);
    const initial: PortfolioResult[] = unique.map(r => ({ ...r, status: 'pending' }));
    setResults([...initial]);
    setAnalysing(true);

    const BATCH = 3;
    const updated = [...initial];

    for (let i = 0; i < updated.length; i += BATCH) {
      // mark batch as loading
      updated.slice(i, i + BATCH).forEach((_, j) => { updated[i + j] = { ...updated[i + j], status: 'loading' }; });
      setResults([...updated]);

      await Promise.all(
        updated.slice(i, i + BATCH).map(async (row, j) => {
          const idx = i + j;
          try {
            const res  = await fetch(`/api/screener?symbol=${encodeURIComponent(row.symbol)}`);
            const data = await res.json() as ScreenerResult & { error?: string; status: string };
            if (data.status === 'success') {
              const rec    = getRecommendation(data);
              const pnlPct = (row.buyPrice && data.last_price)
                ? ((data.last_price - row.buyPrice) / row.buyPrice) * 100
                : undefined;
              updated[idx] = { ...updated[idx], screener: data, recommendation: rec, pnlPct, status: 'done' };
            } else {
              updated[idx] = { ...updated[idx], error: data.error ?? 'Fetch failed', status: 'error' };
            }
          } catch {
            updated[idx] = { ...updated[idx], error: 'Network error', status: 'error' };
          }
          setResults([...updated]);
        })
      );

      if (i + BATCH < updated.length) await new Promise(r => setTimeout(r, 700));
    }

    setAnalysing(false);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) { setParseError('Please upload a .csv file.'); return; }
    const reader = new FileReader();
    reader.onload = e => processFile(e.target?.result as string, file.name);
    reader.readAsText(file);
  }, [processFile]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── summary ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const done = results.filter(r => r.status === 'done');
    return {
      strongBuy: done.filter(r => r.recommendation === 'Strong Buy').length,
      buy:       done.filter(r => r.recommendation === 'Buy').length,
      hold:      done.filter(r => r.recommendation === 'Hold').length,
      sell:      done.filter(r => r.recommendation === 'Sell').length,
      done:      done.length,
      total:     results.length,
    };
  }, [results]);

  // ── sorting ────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      let va = 0, vb = 0;
      if (sortKey === 'rec')   { va = REC_ORDER[a.recommendation ?? ''] ?? 0; vb = REC_ORDER[b.recommendation ?? ''] ?? 0; }
      if (sortKey === 'score') { va = a.screener?.passCount ?? -1;             vb = b.screener?.passCount ?? -1; }
      if (sortKey === 'drop')  { va = a.screener?.dropFromHigh ?? 0;           vb = b.screener?.dropFromHigh ?? 0; }
      if (sortKey === 'pnl')   { va = a.pnlPct ?? 0;                           vb = b.pnlPct ?? 0; }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [results, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k ? <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span> : null;

  // ── export ─────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = results.filter(r => r.status === 'done' && r.screener).map(r => {
      const s = r.screener!;
      return [
        r.symbol, `"${s.company_name}"`, r.qty ?? '', r.buyPrice ?? '',
        s.last_price.toFixed(2),
        r.pnlPct != null ? r.pnlPct.toFixed(2) + '%' : '',
        s.dropFromHigh.toFixed(2) + '%',
        `${s.passCount}/${s.totalChecks}`,
        r.recommendation,
      ].join(',');
    });
    const csv = ['Symbol,Company,Qty,Buy Price,CMP,P&L%,Drop from 52W High,Score,Recommendation', ...rows].join('\n');
    const a   = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'portfolio-analysis.csv',
    });
    a.click();
  };

  const hasPnl  = results.some(r => r.pnlPct  != null);
  const hasQty  = results.some(r => r.qty      != null);
  const hasPrice= results.some(r => r.buyPrice != null);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="theme-page" style={{ color: '#f9fafb' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="CSV workflow"
          icon={<Briefcase className="h-4 w-4" />}
          title="Analyse your full"
          accent="Portfolio"
          description="Upload a broker export and turn raw holdings into ranked buy, hold, and sell signals using the same dip-analysis framework across every line item."
          meta={summary.total > 0 ? `${summary.done}/${summary.total} holdings analysed` : 'Supports Zerodha, Groww, Upstox, and generic CSV layouts'}
          actions={[
            ...(summary.done > 0
              ? [{
                  label: 'Export CSV',
                  onClick: exportCSV,
                  icon: <Download size={14} />,
                }]
              : []),
            {
              label: 'Open screener',
              href: '/screener',
              variant: 'secondary' as const,
            },
          ]}
        />

        {/* ── UPLOAD ZONE (shown before any file is loaded) ── */}
        {results.length === 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className="theme-panel rounded-[28px] border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-all"
              style={{
                borderColor: dragging ? '#6366f1' : 'rgba(255,255,255,0.1)',
                backgroundColor: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.72)',
              }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.18))' }}>
                <Upload size={28} style={{ color: '#6366f1' }} />
              </div>
              <p className="font-semibold text-base mb-1" style={{ color: '#f9fafb' }}>
                Drop your portfolio CSV here
              </p>
              <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                or click to browse
              </p>
              {parseError && (
                <p className="mt-4 text-xs text-center px-4 py-2 rounded-xl max-w-xs"
                  style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' }}>
                  {parseError}
                </p>
              )}
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {/* Info panel */}
            <div className="theme-panel rounded-[28px] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: '#6366f1' }} />
                <span className="font-semibold text-sm" style={{ color: '#f9fafb' }}>Supported formats</span>
              </div>
              <ul className="space-y-2.5 text-sm" style={{ color: '#9ca3af' }}>
                {([
                  ['Zerodha / Kite',  'Instrument, Qty, Avg cost'],
                  ['Groww',           'Symbol, Quantity, Average Buy Price'],
                  ['Upstox',          'Symbol, Quantity, Buy Price'],
                  ['Any broker',      'Any CSV with a Symbol / Instrument column'],
                ] as const).map(([broker, cols]) => (
                  <li key={broker} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
                    <span><strong style={{ color: '#e5e7eb' }}>{broker}</strong> — {cols}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4 border-t" style={{ borderColor: '#1f2937' }}>
                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>No portfolio? Download a sample to try:</p>
                <button
                  onClick={() => {
                    const a = Object.assign(document.createElement('a'), {
                      href:     URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' })),
                      download: 'sample-portfolio.csv',
                    });
                    a.click();
                  }}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border font-medium"
                  style={{ borderColor: '#1f2937', color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' }}
                >
                  <Download size={12} /> Download sample CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {results.length > 0 && (
          <>
            {/* Progress + summary */}
            <div className="theme-panel rounded-[28px] p-5 mb-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText size={15} style={{ color: '#6b7280' }} />
                  <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>{fileName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1f2937', color: '#6b7280' }}>
                    {results.length} holding{results.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {analysing && (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: '#f97316' }}>
                      <RefreshCw size={12} className="animate-spin" />
                      Analysing {summary.done}/{summary.total}…
                    </span>
                  )}
                  <button
                    onClick={() => { setResults([]); setFileName(''); setParseError(''); setSortKey('rec'); }}
                    className="text-xs px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: '#1f2937', color: '#6b7280', backgroundColor: 'rgba(2,6,23,0.72)' }}
                  >
                    Upload new file
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {analysing && (
                <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: '#1f2937' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(summary.done / summary.total) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                </div>
              )}

              {/* Summary tiles */}
              {summary.done > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    ['Strong Buy', summary.strongBuy, '#22c55e', 'Fundamentally sound + significant dip'],
                    ['Buy',        summary.buy,       '#60a5fa', 'Good fundamentals + moderate dip'],
                    ['Hold',       summary.hold,      '#facc15', 'Decent fundamentals, no big dip'],
                    ['Sell',       summary.sell,      '#ef4444', 'Weak fundamentals — consider exit'],
                  ] as const).map(([label, count, color, tip]) => (
                    <div key={label} title={tip} className="rounded-xl p-3 text-center cursor-default"
                      style={{ backgroundColor: `${color}12`, border: `1px solid ${color}28` }}>
                      <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="theme-panel overflow-hidden rounded-[28px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>Stock</th>
                      {hasQty   && <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>Qty</th>}
                      {hasPrice && <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>Avg Cost</th>}
                      <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>CMP</th>
                      {hasPnl && (
                        <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider cursor-pointer select-none"
                          style={{ color: sortKey === 'pnl' ? '#f97316' : '#6b7280' }} onClick={() => toggleSort('pnl')}>
                          P&amp;L% <SortIcon k="pnl" />
                        </th>
                      )}
                      <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider cursor-pointer select-none"
                        style={{ color: sortKey === 'drop' ? '#f97316' : '#6b7280' }} onClick={() => toggleSort('drop')}>
                        52W Drop <SortIcon k="drop" />
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>
                        Checks
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider cursor-pointer select-none"
                        style={{ color: sortKey === 'score' ? '#f97316' : '#6b7280' }} onClick={() => toggleSort('score')}>
                        Score <SortIcon k="score" />
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider cursor-pointer select-none"
                        style={{ color: sortKey === 'rec' ? '#f97316' : '#6b7280' }} onClick={() => toggleSort('rec')}>
                        Signal <SortIcon k="rec" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row, i) => {
                      const s         = row.screener;
                      const isLoading = row.status === 'loading';
                      const isPending = row.status === 'pending';
                      const isError   = row.status === 'error';
                      const recStyle  = row.recommendation ? REC[row.recommendation] : null;
                      const checks    = s ? [s.checks.profitGrowth3Y, s.checks.opmStable, s.checks.promoterStakeStable, s.checks.epsIncreasing] : null;

                      return (
                        <tr key={row.symbol}
                          className="border-t transition-colors"
                          style={{ borderColor: '#1f2937', backgroundColor: i % 2 === 0 ? '#0a0e1a' : 'transparent' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111827')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#0a0e1a' : 'transparent')}
                        >
                          {/* Stock name */}
                          <td className="px-4 py-3.5">
                            <a href={`/stock/${row.symbol}`} target="_blank" rel="noopener noreferrer"
                              className="font-bold hover:underline" style={{ color: '#f9fafb' }}>
                              {s?.symbol ?? row.symbol}
                            </a>
                            <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: '#6b7280' }}>
                              {isError ? (row.error ?? 'Failed') : (s?.company_name ?? (isPending ? 'Waiting…' : isLoading ? 'Fetching…' : ''))}
                            </p>
                          </td>

                          {/* Qty */}
                          {hasQty && <td className="px-4 py-3.5 text-right" style={{ color: '#9ca3af' }}>{row.qty ?? '—'}</td>}

                          {/* Avg cost */}
                          {hasPrice && (
                            <td className="px-4 py-3.5 text-right" style={{ color: '#9ca3af' }}>
                              {row.buyPrice != null ? `₹${row.buyPrice.toFixed(2)}` : '—'}
                            </td>
                          )}

                          {/* CMP */}
                          <td className="px-4 py-3.5 text-right font-semibold">
                            {(isLoading || isPending)
                              ? <RefreshCw size={13} className={`ml-auto ${isLoading ? 'animate-spin' : 'opacity-20'}`} style={{ color: '#6b7280' }} />
                              : isError
                                ? <span style={{ color: '#4b5563' }}>—</span>
                                : <span style={{ color: '#f9fafb' }}>₹{s!.last_price.toFixed(2)}</span>
                            }
                          </td>

                          {/* P&L% */}
                          {hasPnl && (
                            <td className="px-4 py-3.5 text-right font-semibold">
                              {row.pnlPct != null
                                ? <span style={{ color: row.pnlPct >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {row.pnlPct >= 0 ? '+' : ''}{row.pnlPct.toFixed(2)}%
                                  </span>
                                : '—'}
                            </td>
                          )}

                          {/* 52W drop */}
                          <td className="px-4 py-3.5 text-right font-semibold">
                            {s
                              ? <span style={{ color: Math.abs(s.dropFromHigh) >= 20 ? '#22c55e' : Math.abs(s.dropFromHigh) >= 10 ? '#facc15' : '#9ca3af' }}>
                                  {s.dropFromHigh.toFixed(1)}%
                                </span>
                              : '—'}
                          </td>

                          {/* Check dots */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {checks
                                ? checks.map((c, ci) => (
                                    <div key={ci} className="relative group cursor-default">
                                      <div className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: c.pass ? '#22c55e' : '#ef4444' }} />
                                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-10
                                        text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none"
                                        style={{ backgroundColor: '#1f2937', color: '#f9fafb', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                        {CHECK_INFO[ci].label}: {c.value}
                                      </div>
                                    </div>
                                  ))
                                : <span className="tracking-widest text-xs" style={{ color: '#374151' }}>• • • •</span>}
                            </div>
                          </td>

                          {/* Score */}
                          <td className="px-4 py-3.5 text-center font-bold">
                            {s
                              ? <span style={{ color: s.passCount >= 3 ? '#22c55e' : s.passCount >= 2 ? '#facc15' : '#ef4444' }}>
                                  {s.passCount}/{s.totalChecks}
                                </span>
                              : '—'}
                          </td>

                          {/* Signal */}
                          <td className="px-4 py-3.5 text-center">
                            {row.recommendation && recStyle
                              ? <span className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                                  style={{ backgroundColor: recStyle.bg, color: recStyle.color, borderColor: recStyle.border }}>
                                  {row.recommendation}
                                </span>
                              : isError
                                ? <span className="text-xs" style={{ color: '#4b5563' }}>Error</span>
                                : <span className="text-xs" style={{ color: '#374151' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs" style={{ color: '#6b7280' }}>
              <span className="font-semibold" style={{ color: '#4b5563' }}>Checks:</span>
              {CHECK_INFO.map((c, i) => (
                <span key={c.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4b5563' }} />
                  {i + 1}. {c.label}
                </span>
              ))}
              <span className="ml-auto" style={{ color: '#374151' }}>Signal = Screener score × drop from 52W high</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
