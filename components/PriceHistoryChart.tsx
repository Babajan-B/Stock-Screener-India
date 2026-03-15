'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HistoricalBar } from '@/lib/types';

interface PriceHistoryChartProps {
  data: HistoricalBar[];
  color?: string;
  currency?: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function PriceHistoryChart({
  data,
  color = '#f97316',
  currency = 'INR',
}: PriceHistoryChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="stock-price-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(value: number) => formatCurrency(value, currency)}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={88}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(2, 6, 23, 0.94)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              color: '#f8fafc',
            }}
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN')}
            formatter={(value: number) => [formatCurrency(value, currency), 'Close']}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#stock-price-fill)"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
