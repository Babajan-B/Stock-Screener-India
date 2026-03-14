'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CandlestickChart, BarChart2, TrendingDown, Briefcase, Trophy, Star } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <nav className="theme-panel-strong mx-auto max-w-7xl rounded-[28px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            >
              <CandlestickChart size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#f9fafb' }}>
              Stock<span style={{ color: '#f97316' }}>IN</span>
            </span>
          </Link>

          {/* Search (center) */}
          <div className="flex-1 max-w-lg hidden sm:block">
            <SearchBar />
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/' ? 'rgba(249,115,22,0.14)' : 'transparent',
                color: pathname === '/' ? '#fbbf24' : '#94a3b8',
              }}
            >
              <BarChart2 size={15} />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            <Link
              href="/watchlist"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/watchlist' ? 'rgba(249,115,22,0.14)' : 'transparent',
                color: pathname === '/watchlist' ? '#fbbf24' : '#94a3b8',
              }}
            >
              <Star size={15} />
              <span className="hidden md:inline">Watchlist</span>
            </Link>
            <Link
              href="/screener"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/screener' ? 'rgba(239,68,68,0.14)' : 'transparent',
                color: pathname === '/screener' ? '#f87171' : '#94a3b8',
              }}
            >
              <TrendingDown size={15} />
              <span className="hidden md:inline">Screener</span>
            </Link>
            <Link
              href="/portfolio"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/portfolio' ? 'rgba(99,102,241,0.14)' : 'transparent',
                color: pathname === '/portfolio' ? '#a5b4fc' : '#94a3b8',
              }}
            >
              <Briefcase size={15} />
              <span className="hidden md:inline">Portfolio</span>
            </Link>
            <Link
              href="/top-screener"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/top-screener' ? 'rgba(245,158,11,0.14)' : 'transparent',
                color: pathname === '/top-screener' ? '#fbbf24' : '#94a3b8',
              }}
            >
              <Trophy size={15} />
              <span className="hidden md:inline">Rankings</span>
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <div className="pb-3 sm:hidden">
          <SearchBar />
        </div>
      </nav>
    </div>
  );
}
