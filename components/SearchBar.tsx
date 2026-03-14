'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp, TrendingDown } from 'lucide-react';

interface SearchResult {
  symbol: string;
  company_name: string;
  nse_url: string;
  bse_url: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        // Deduplicate by symbol to avoid React key conflicts
        const raw: SearchResult[] = data.results || [];
        const seen = new Set<string>();
        const unique = raw.filter(r => {
          if (seen.has(r.symbol)) return false;
          seen.add(r.symbol);
          return true;
        });
        setResults(unique);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  const handleSelect = (symbol: string) => {
    setQuery('');
    setResults([]);
    setFocused(false);
    router.push(`/stock/${symbol}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 border transition-all"
        style={{
          backgroundColor: '#111827',
          borderColor: focused ? '#f97316' : '#1f2937',
          boxShadow: focused ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none',
        }}
      >
        <Search size={18} style={{ color: focused ? '#f97316' : '#6b7280' }} />
        <input
          type="text"
          placeholder="Search stocks... (e.g. Reliance, TCS, INFY)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#f9fafb' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }}>
            <X size={16} style={{ color: '#6b7280' }} />
          </button>
        )}
        {loading && (
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
        )}
      </div>

      {focused && results.length > 0 && (
        <div
          className="absolute top-full mt-2 left-0 right-0 rounded-xl border overflow-hidden z-50 shadow-2xl"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          {results.slice(0, 8).map((r, i) => (
            <button
              key={`${r.symbol}-${i}`}
              onClick={() => handleSelect(r.symbol)}
              className="w-full flex items-center justify-between px-4 py-3 text-left border-b transition-colors"
              style={{ borderColor: '#1f2937' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1f2937')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div>
                <p className="font-semibold text-sm" style={{ color: '#f9fafb' }}>{r.symbol}</p>
                <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#9ca3af' }}>{r.company_name}</p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>NSE</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>BSE</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {focused && query.length >= 2 && !loading && results.length === 0 && (
        <div
          className="absolute top-full mt-2 left-0 right-0 rounded-xl border px-4 py-6 text-center z-50"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          <p className="text-sm" style={{ color: '#9ca3af' }}>No stocks found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
