'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number; // positive or negative
  icon?: React.ReactNode;
  accent?: string;
}

export default function StatCard({ label, value, sub, trend, icon, accent = '#f97316' }: StatCardProps) {
  const isUp = trend !== undefined && trend >= 0;
  const trendColor = trend === undefined ? '#9ca3af' : trend >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-2"
      style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
          {label}
        </p>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
            <span style={{ color: accent }}>{icon}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: '#f9fafb' }}>{value}</p>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: trendColor }}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? '+' : ''}{trend?.toFixed(2)}%
            </span>
          )}
          {sub && (
            <span className="text-xs" style={{ color: '#6b7280' }}>{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}
