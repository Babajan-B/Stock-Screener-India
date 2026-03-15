export type AlertKind =
  | 'price_above'
  | 'price_below'
  | 'daily_move_above'
  | 'daily_move_below'
  | 'dip_from_high'
  | 'core_score_at_least';

export interface StockAlert {
  id: string;
  symbol: string;
  kind: AlertKind;
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

export interface AlertEvaluationContext {
  symbol: string;
  currentPrice?: number;
  percentChange?: number;
  week52High?: number;
  coreScore?: number;
  totalChecks?: number;
}

export interface EvaluatedAlert {
  alert: StockAlert;
  triggered: boolean;
  currentValue: string;
  reason: string;
}

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  price_above: 'Price goes above',
  price_below: 'Price goes below',
  daily_move_above: 'Daily move above',
  daily_move_below: 'Daily move below',
  dip_from_high: 'Drop from 52W high at least',
  core_score_at_least: 'Core screener score at least',
};

export function describeAlert(alert: StockAlert) {
  if (alert.kind === 'price_above' || alert.kind === 'price_below') {
    return `${ALERT_KIND_LABELS[alert.kind]} ₹${alert.threshold.toFixed(2)}`;
  }
  if (alert.kind === 'core_score_at_least') {
    return `${ALERT_KIND_LABELS[alert.kind]} ${alert.threshold}/4`;
  }
  return `${ALERT_KIND_LABELS[alert.kind]} ${alert.threshold.toFixed(2)}%`;
}

export function evaluateAlert(
  alert: StockAlert,
  context: AlertEvaluationContext
): EvaluatedAlert {
  if (alert.symbol !== context.symbol) {
    return {
      alert,
      triggered: false,
      currentValue: 'N/A',
      reason: 'Alert symbol does not match the current context.',
    };
  }

  switch (alert.kind) {
    case 'price_above': {
      const currentPrice = context.currentPrice;
      const triggered = typeof currentPrice === 'number' && currentPrice >= alert.threshold;
      return {
        alert,
        triggered,
        currentValue: typeof currentPrice === 'number' ? `₹${currentPrice.toFixed(2)}` : 'N/A',
        reason: triggered
          ? `Current price is above ₹${alert.threshold.toFixed(2)}.`
          : `Waiting for price to move above ₹${alert.threshold.toFixed(2)}.`,
      };
    }
    case 'price_below': {
      const currentPrice = context.currentPrice;
      const triggered = typeof currentPrice === 'number' && currentPrice <= alert.threshold;
      return {
        alert,
        triggered,
        currentValue: typeof currentPrice === 'number' ? `₹${currentPrice.toFixed(2)}` : 'N/A',
        reason: triggered
          ? `Current price is below ₹${alert.threshold.toFixed(2)}.`
          : `Waiting for price to move below ₹${alert.threshold.toFixed(2)}.`,
      };
    }
    case 'daily_move_above': {
      const percentChange = context.percentChange;
      const triggered = typeof percentChange === 'number' && percentChange >= alert.threshold;
      return {
        alert,
        triggered,
        currentValue: typeof percentChange === 'number' ? `${percentChange.toFixed(2)}%` : 'N/A',
        reason: triggered
          ? `Today's move is above ${alert.threshold.toFixed(2)}%.`
          : `Waiting for a daily move above ${alert.threshold.toFixed(2)}%.`,
      };
    }
    case 'daily_move_below': {
      const percentChange = context.percentChange;
      const triggered = typeof percentChange === 'number' && percentChange <= -Math.abs(alert.threshold);
      return {
        alert,
        triggered,
        currentValue: typeof percentChange === 'number' ? `${percentChange.toFixed(2)}%` : 'N/A',
        reason: triggered
          ? `Today's move is below -${Math.abs(alert.threshold).toFixed(2)}%.`
          : `Waiting for a daily move below -${Math.abs(alert.threshold).toFixed(2)}%.`,
      };
    }
    case 'dip_from_high': {
      const { currentPrice, week52High } = context;
      const drop = typeof currentPrice === 'number' && typeof week52High === 'number' && week52High > 0
        ? Math.abs(((currentPrice - week52High) / week52High) * 100)
        : null;
      const triggered = drop !== null && drop >= alert.threshold;
      return {
        alert,
        triggered,
        currentValue: drop !== null ? `${drop.toFixed(2)}%` : 'N/A',
        reason: triggered
          ? `The stock is down at least ${alert.threshold.toFixed(2)}% from its 52-week high.`
          : `Waiting for the stock to fall ${alert.threshold.toFixed(2)}% from its 52-week high.`,
      };
    }
    case 'core_score_at_least': {
      const score = context.coreScore;
      const total = context.totalChecks ?? 4;
      const triggered = typeof score === 'number' && score >= alert.threshold;
      return {
        alert,
        triggered,
        currentValue: typeof score === 'number' ? `${score}/${total}` : 'N/A',
        reason: triggered
          ? `Core screener score reached ${alert.threshold}/${total} or better.`
          : `Waiting for core screener score to reach ${alert.threshold}/${total}.`,
      };
    }
  }
}
