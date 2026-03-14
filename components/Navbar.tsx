'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, BarChart2, TrendingDown, Briefcase, Trophy } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ backgroundColor: 'rgba(10,14,26,0.92)', borderColor: '#1f2937' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
            >
              <TrendingUp size={18} className="text-white" />
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
                backgroundColor: pathname === '/' ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: pathname === '/' ? '#f97316' : '#9ca3af',
              }}
            >
              <BarChart2 size={15} />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            <Link
              href="/watchlist"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/watchlist' ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: pathname === '/watchlist' ? '#f97316' : '#9ca3af',
              }}
            >
              <TrendingUp size={15} />
              <span className="hidden md:inline">Watchlist</span>
            </Link>
            <Link
              href="/screener"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/screener' ? 'rgba(239,68,68,0.12)' : 'transparent',
                color: pathname === '/screener' ? '#ef4444' : '#9ca3af',
              }}
            >
              <TrendingDown size={15} />
              <span className="hidden md:inline">Screener</span>
            </Link>
            <Link
              href="/portfolio"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/portfolio' ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: pathname === '/portfolio' ? '#818cf8' : '#9ca3af',
              }}
            >
              <Briefcase size={15} />
              <span className="hidden md:inline">Portfolio</span>
            </Link>
            <Link
              href="/top-screener"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: pathname === '/top-screener' ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: pathname === '/top-screener' ? '#f59e0b' : '#9ca3af',
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
      </div>
    </nav>
  );
}
