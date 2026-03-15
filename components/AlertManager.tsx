'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import {
  ALERT_KIND_LABELS,
  AlertKind,
  StockAlert,
  describeAlert,
  evaluateAlert,
} from '@/lib/alertRules';
import {
  deleteAlert,
  getAlertsForSymbol,
  saveAlert,
  toggleAlert,
} from '@/lib/alertsStorage';

const ALERT_KIND_OPTIONS: AlertKind[] = [
  'price_above',
  'price_below',
  'daily_move_above',
  'daily_move_below',
  'dip_from_high',
  'core_score_at_least',
];

export default function AlertManager({
  symbol,
  currentPrice,
  percentChange,
  week52High,
  coreScore,
  totalChecks = 4,
}: {
  symbol: string;
  currentPrice?: number;
  percentChange?: number;
  week52High?: number;
  coreScore?: number;
  totalChecks?: number;
}) {
  const [kind, setKind] = useState<AlertKind>('price_above');
  const [threshold, setThreshold] = useState('0');
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  const loadAlerts = () => {
    setAlerts(getAlertsForSymbol(symbol));
  };

  useEffect(() => {
    loadAlerts();
  }, [symbol]);

  useEffect(() => {
    if (kind === 'price_above' || kind === 'price_below') {
      setThreshold(currentPrice ? currentPrice.toFixed(2) : '0');
      return;
    }
    if (kind === 'daily_move_above' || kind === 'daily_move_below') {
      setThreshold('2');
      return;
    }
    if (kind === 'dip_from_high') {
      setThreshold('25');
      return;
    }
    setThreshold('3');
  }, [currentPrice, kind]);

  const evaluatedAlerts = useMemo(() => {
    return alerts.map((alert) =>
      evaluateAlert(alert, {
        symbol,
        currentPrice,
        percentChange,
        week52High,
        coreScore,
        totalChecks,
      })
    );
  }, [alerts, coreScore, currentPrice, percentChange, symbol, totalChecks, week52High]);

  const handleSave = () => {
    const parsed = Number(threshold);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    saveAlert({
      id: `${symbol}-${kind}-${Date.now()}`,
      symbol,
      kind,
      threshold: parsed,
      enabled: true,
      createdAt: new Date().toISOString(),
    });
    loadAlerts();
  };

  return (
    <section className="theme-panel rounded-[28px] p-5">
      <div className="mb-5 flex items-center gap-2">
        <Bell size={16} style={{ color: '#f97316' }} />
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
            Stock Alerts
          </h2>
          <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
            Alerts are stored in this browser for {symbol}. They are evaluated whenever you open the stock or watchlist pages.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_0.9fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
            Alert Type
          </label>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as AlertKind)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: 'rgba(2,6,23,0.72)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#f9fafb',
            }}
          >
            {ALERT_KIND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ALERT_KIND_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
            Threshold
          </label>
          <input
            type="number"
            min="0"
            step={kind === 'core_score_at_least' ? '1' : '0.01'}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: 'rgba(2,6,23,0.72)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#f9fafb',
            }}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSave}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: '#f97316', color: '#fff' }}
          >
            Save alert
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {evaluatedAlerts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm" style={{ color: '#9ca3af' }}>
            No alerts configured for this stock yet.
          </div>
        ) : (
          evaluatedAlerts.map(({ alert, triggered, currentValue, reason }) => (
            <div
              key={alert.id}
              className="rounded-2xl border px-4 py-4"
              style={{
                borderColor: triggered ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.1)',
                backgroundColor: triggered ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
                    {describeAlert(alert)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>
                    Current value: {currentValue}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: triggered ? '#86efac' : '#94a3b8' }}>
                    {reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      toggleAlert(alert.id);
                      loadAlerts();
                    }}
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: alert.enabled ? 'rgba(34,197,94,0.14)' : 'rgba(148,163,184,0.14)',
                      color: alert.enabled ? '#22c55e' : '#94a3b8',
                    }}
                  >
                    {alert.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => {
                      deleteAlert(alert.id);
                      loadAlerts();
                    }}
                    className="rounded-full border border-white/10 p-2"
                    style={{ color: '#ef4444' }}
                    title="Delete alert"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
