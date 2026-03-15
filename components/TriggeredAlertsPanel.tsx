'use client';

import { useEffect, useMemo, useRef } from 'react';
import { BellRing } from 'lucide-react';
import { readAlerts } from '@/lib/alertsStorage';
import { describeAlert, evaluateAlert } from '@/lib/alertRules';
import { StockListItem } from '@/lib/types';

export default function TriggeredAlertsPanel({
  stocks,
  coreScores,
}: {
  stocks: StockListItem[];
  coreScores: Record<string, { passCount: number; totalChecks: number }>;
}) {
  const alerts = useMemo(() => readAlerts().filter((alert) => alert.enabled), []);
  const shownNotifications = useRef<Set<string>>(new Set());

  const triggeredAlerts = useMemo(() => {
    return alerts
      .map((alert) => {
        const stock = stocks.find((item) => item.symbol === alert.symbol);
        const score = coreScores[alert.symbol];

        if (!stock && !score) return null;

        return evaluateAlert(alert, {
          symbol: alert.symbol,
          currentPrice: stock?.last_price,
          percentChange: stock?.percent_change,
          week52High: stock?.year_high,
          coreScore: score?.passCount,
          totalChecks: score?.totalChecks,
        });
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.triggered);
  }, [alerts, coreScores, stocks]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    for (const item of triggeredAlerts) {
      if (shownNotifications.current.has(item.alert.id)) continue;

      new Notification(`${item.alert.symbol} alert triggered`, {
        body: `${describeAlert(item.alert)} · ${item.currentValue}`,
      });
      shownNotifications.current.add(item.alert.id);
    }
  }, [triggeredAlerts]);

  return (
    <section className="theme-panel rounded-[28px] p-5 mb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BellRing size={16} style={{ color: '#f97316' }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
              Triggered Alerts
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
              Alerts are checked against your current watchlist data in this browser.
            </p>
          </div>
        </div>
        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
          <button
            onClick={() => Notification.requestPermission()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium"
            style={{ color: '#f9fafb' }}
          >
            Enable browser notifications
          </button>
        )}
      </div>

      {triggeredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm" style={{ color: '#9ca3af' }}>
          No active alerts right now.
        </div>
      ) : (
        <div className="space-y-3">
          {triggeredAlerts.map((item) => (
            <div
              key={item.alert.id}
              className="rounded-2xl border px-4 py-4"
              style={{
                borderColor: 'rgba(34,197,94,0.22)',
                backgroundColor: 'rgba(34,197,94,0.07)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: '#f9fafb' }}>
                {item.alert.symbol} · {describeAlert(item.alert)}
              </p>
              <p className="mt-1 text-xs" style={{ color: '#86efac' }}>
                Current value: {item.currentValue}
              </p>
              <p className="mt-2 text-xs" style={{ color: '#9ca3af' }}>
                {item.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
