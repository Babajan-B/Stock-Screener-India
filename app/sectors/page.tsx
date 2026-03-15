'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/ui/page-hero';
import { Layers3, ArrowRight } from 'lucide-react';

interface SectorSummary {
  slug: string;
  name: string;
  description: string;
  count: number;
  accent: string;
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSectors() {
      try {
        const res = await fetch('/api/sectors');
        const data = await res.json();
        setSectors(data.sectors || []);
      } finally {
        setLoading(false);
      }
    }

    loadSectors();
  }, []);

  return (
    <div className="theme-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHero
          badge="Sector discovery"
          icon={<Layers3 className="h-4 w-4" />}
          title="Explore the market by"
          accent="Sector"
          description="Move from broad market noise into focused sector baskets so you can compare stocks in the right context."
          meta="Curated India sector pages with quick access to leading names."
        />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="theme-panel h-52 animate-pulse rounded-[28px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sectors.map((sector) => (
              <Link
                key={sector.slug}
                href={`/sectors/${sector.slug}`}
                className="theme-panel rounded-[28px] p-5 transition-transform hover:-translate-y-0.5"
              >
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                  {sector.count} stocks
                </p>
                <h2 className="mt-2 text-2xl font-black" style={{ color: '#f9fafb' }}>
                  {sector.name}
                </h2>
                <p className="mt-3 text-sm leading-7" style={{ color: '#9ca3af' }}>
                  {sector.description}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: sector.accent }}>
                  Open sector <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
