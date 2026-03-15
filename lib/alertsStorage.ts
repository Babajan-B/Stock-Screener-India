'use client';

import { StockAlert } from '@/lib/alertRules';

const ALERTS_STORAGE_KEY = 'stockin_alerts';

export function readAlerts(): StockAlert[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StockAlert[];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: StockAlert[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

export function getAlertsForSymbol(symbol: string) {
  return readAlerts().filter((alert) => alert.symbol === symbol.toUpperCase());
}

export function saveAlert(alert: StockAlert) {
  const current = readAlerts().filter((item) => item.id !== alert.id);
  writeAlerts([alert, ...current]);
}

export function deleteAlert(id: string) {
  writeAlerts(readAlerts().filter((alert) => alert.id !== id));
}

export function toggleAlert(id: string) {
  writeAlerts(
    readAlerts().map((alert) =>
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    )
  );
}
