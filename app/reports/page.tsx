'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import { buildStockResearchReport } from '@/lib/reportBuilder';
import { NewsItem, StockResponse } from '@/lib/types';
import { Download, FileText, Copy } from 'lucide-react';

const REPORT_PRESETS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'];

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

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsPageFallback />}>
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const initialSymbol = (searchParams.get('symbol') || 'RELIANCE').toUpperCase();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [stock, setStock] = useState<StockResponse | null>(null);
  const [screener, setScreener] = useState<ScreenerPayload | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadReport = async (nextSymbol: string) => {
    const cleaned = nextSymbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
    if (!cleaned) return;

    setLoading(true);
    setError('');
    try {
      const [stockRes, screenerRes, newsRes] = await Promise.all([
        fetch(`/api/stock?symbol=${encodeURIComponent(cleaned)}.NS`),
        fetch(`/api/screener?symbol=${encodeURIComponent(cleaned)}`),
        fetch(`/api/news?symbol=${encodeURIComponent(cleaned)}`),
      ]);

      const [stockJson, screenerJson, newsJson] = await Promise.all([
        stockRes.json(),
        screenerRes.json(),
        newsRes.json(),
      ]);

      if (stockJson.status !== 'success' || screenerJson.status !== 'success') {
        setError(stockJson.message || screenerJson.message || 'Unable to build report.');
        setStock(null);
        setScreener(null);
        setNews([]);
        return;
      }

      setSymbol(cleaned);
      setStock(stockJson);
      setScreener(screenerJson);
      setNews(newsJson.status === 'success' ? newsJson.news || [] : []);
    } catch {
      setError('Unable to build report. Please try again.');
      setStock(null);
      setScreener(null);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  const reportText = useMemo(() => {
    if (!stock || !screener) return '';
    return buildStockResearchReport({ stock, screener, news });
  }, [news, screener, stock]);

  const downloadReport = () => {
    if (!reportText) return;
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([reportText], { type: 'text/plain' })),
      download: `${symbol.toLowerCase()}-research-report.txt`,
    });
    a.click();
  };

  const copyReport = async () => {
    if (!reportText) return;
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="theme-page">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="Exportable summary"
          icon={<FileText className="h-4 w-4" />}
          title="Generate stock"
          accent="Research Reports"
          description="Pull together price context, dip-analysis results, events, and headlines into one exportable note."
          meta="Text-first export for sharing, note-taking, or offline review."
        />

        <div className="theme-panel rounded-[28px] p-5 mb-8">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="Enter stock symbol"
              className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: 'rgba(2,6,23,0.72)',
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#f9fafb',
              }}
            />
            <button
              onClick={() => loadReport(symbol)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: '#f97316', color: '#fff', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Generating...' : 'Generate report'}
            </button>
            <button
              onClick={copyReport}
              disabled={!reportText}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium"
              style={{ color: '#f9fafb', opacity: reportText ? 1 : 0.5 }}
            >
              <Copy size={14} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={downloadReport}
              disabled={!reportText}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium"
              style={{ color: '#f9fafb', opacity: reportText ? 1 : 0.5 }}
            >
              <Download size={14} />
              Download
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {REPORT_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setSymbol(preset);
                  void loadReport(preset);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold"
                style={{
                  color: symbol === preset ? '#fbbf24' : '#d1d5db',
                  backgroundColor: symbol === preset ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.05)',
                }}
              >
                {preset}
              </button>
            ))}
          </div>
          {error && (
            <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        <div className="theme-panel rounded-[28px] p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
              Report Preview
            </p>
            <h2 className="mt-1 text-2xl font-black" style={{ color: '#f9fafb' }}>
              {symbol} research summary
            </h2>
          </div>
          {loading ? (
            <div className="h-[420px] animate-pulse rounded-[24px]" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <pre
              className="overflow-x-auto whitespace-pre-wrap rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm leading-7"
              style={{ color: '#d1d5db' }}
            >
              {reportText || 'Generate a report to preview it here.'}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}

function ReportsPageFallback() {
  return (
    <div className="theme-page">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="theme-panel rounded-[28px] h-[520px] animate-pulse" />
      </main>
    </div>
  );
}
