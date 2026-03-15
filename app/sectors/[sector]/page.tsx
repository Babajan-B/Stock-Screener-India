'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import StockCard, { StockCardSkeleton } from '@/components/StockCard';
import StatCard from '@/components/StatCard';
import { StockListItem, formatINR } from '@/lib/types';
import { Layers3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface SectorResponse {
  status: string;
  sector?: {
    slug: string;
    name: string;
    description: string;
    accent: string;
  };
  stocks?: StockListItem[];
  stats?: {
    total: number;
    gainers: number;
    losers: number;
    topMover: {
      symbol: string;
      percent_change: number;
      last_price: number;
    } | null;
  };
}

export default function SectorDetailPage() {
  const params = useParams();
  const slug = String(params.sector || '');
  const [data, setData] = useState<SectorResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSector() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sectors?sector=${encodeURIComponent(slug)}`);
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    }

    loadSector();
  }, [slug]);

  const sortedStocks = useMemo(() => {
    return [...(data?.stocks || [])].sort((a, b) => b.market_cap - a.market_cap);
  }, [data?.stocks]);

  return (
    <div className="theme-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="Sector basket"
          icon={<Layers3 className="h-4 w-4" />}
          title={data?.sector?.name || 'Sector'}
          description={data?.sector?.description || 'Focused basket of Indian stocks in the same operating theme.'}
          meta={data?.stats ? `${data.stats.total} tracked names in this basket` : 'Loading sector data'}
        />

        {loading ? (
          <>
            <div className="grid gap-4 mb-8 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="theme-panel h-32 animate-pulse rounded-[28px]" />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <StockCardSkeleton key={index} />
              ))}
            </div>
          </>
        ) : data?.status !== 'success' ? (
          <div className="theme-panel rounded-[28px] px-5 py-10 text-center text-sm" style={{ color: '#ef4444' }}>
            Sector data is unavailable.
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-8 lg:grid-cols-4">
              <StatCard
                label="Tracked Names"
                value={`${data.stats?.total ?? 0}`}
                sub="In this sector basket"
                accent={data.sector?.accent || '#f97316'}
                icon={<Layers3 size={16} />}
              />
              <StatCard
                label="Gainers"
                value={`${data.stats?.gainers ?? 0}`}
                sub="Positive today"
                accent="#22c55e"
                icon={<TrendingUp size={16} />}
              />
              <StatCard
                label="Losers"
                value={`${data.stats?.losers ?? 0}`}
                sub="Negative today"
                accent="#ef4444"
                icon={<TrendingDown size={16} />}
              />
              <StatCard
                label="Top Mover"
                value={data.stats?.topMover?.symbol ?? 'N/A'}
                sub={data.stats?.topMover ? `${data.stats.topMover.percent_change >= 0 ? '+' : ''}${data.stats.topMover.percent_change.toFixed(2)}% · ${formatINR(data.stats.topMover.last_price)}` : 'No movement'}
                accent="#0ea5e9"
                icon={<Activity size={16} />}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {sortedStocks.map((stock) => (
                <StockCard key={stock.ticker || stock.symbol} stock={stock} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
