export interface CheckResult {
  pass: boolean | null;
  label: string;
  detail: string;
  value: string;
}

export interface AdvancedMetricResult {
  pass: boolean | null;
  label: string;
  detail: string;
  value: string;
  benchmark: string;
}

export interface ScreenerAnalysis {
  symbol: string;
  ticker: string;
  exchange: string;
  company_name: string;
  last_price: number;
  week52High: number;
  week52Low: number;
  dropFromHigh: number;
  change: number;
  percent_change: number;
  sector: string;
  industry: string;
  checks: {
    profitGrowth3Y: CheckResult;
    opmStable: CheckResult;
    promoterStakeStable: CheckResult;
    epsIncreasing: CheckResult;
  };
  passCount: number;
  totalChecks: number;
  advancedMetrics: {
    returnOnEquity: AdvancedMetricResult;
    debtToEquity: AdvancedMetricResult;
    revenueGrowth: AdvancedMetricResult;
    freeCashFlow: AdvancedMetricResult;
    currentRatio: AdvancedMetricResult;
  };
  advancedPassCount: number;
  advancedTotalChecks: number;
}

function unwrapNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'raw' in value) {
    return unwrapNumber((value as { raw?: unknown }).raw);
  }
  return null;
}

function cagr(start: number, end: number, years: number): number {
  if (!start || start <= 0 || !end || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

function isTrendingUp(values: number[]): boolean {
  if (values.length < 2) return false;
  let increases = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increases++;
  }
  return increases >= values.length - 1;
}

function isStable(values: number[]): boolean {
  if (values.length < 2) return true;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 100;
  return coeffVar < 20;
}

function formatPercent(value: number | null, scale = 1) {
  if (value === null) return 'N/A';
  return `${(value * scale).toFixed(1)}%`;
}

function formatCurrencyCompact(value: number | null) {
  if (value === null) return 'N/A';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `₹${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  return `₹${value.toFixed(0)}`;
}

function normalizeDebtToEquity(value: number | null) {
  if (value === null) return null;
  return value > 10 ? value / 100 : value;
}

export function buildScreenerAnalysis({
  symbol,
  ticker,
  exchange,
  quote,
  summary,
}: {
  symbol: string;
  ticker: string;
  exchange: string;
  quote: Record<string, unknown>;
  summary: Record<string, unknown> | null;
}): ScreenerAnalysis {
  const fd = summary?.financialData as Record<string, unknown> | undefined;
  const ks = summary?.defaultKeyStatistics as Record<string, unknown> | undefined;
  const incomeStatements = ((summary?.incomeStatementHistory as Record<string, unknown[]> | undefined)
    ?.incomeStatementHistory ?? []) as Array<Record<string, unknown>>;
  const earningsHistory = ((summary?.earningsHistory as Record<string, unknown> | undefined)
    ?.history ?? []) as Array<Record<string, unknown>>;
  const majorHolders = summary?.majorHoldersBreakdown as Record<string, unknown> | undefined;
  const assetProfile = summary?.assetProfile as Record<string, unknown> | undefined;

  const last_price = unwrapNumber(quote.regularMarketPrice) ?? 0;
  const week52High = unwrapNumber(quote.fiftyTwoWeekHigh) ?? 0;
  const week52Low = unwrapNumber(quote.fiftyTwoWeekLow) ?? 0;
  const dropFromHigh = week52High > 0 ? ((last_price - week52High) / week52High) * 100 : 0;
  const change = unwrapNumber(quote.regularMarketChange) ?? 0;
  const percent_change = unwrapNumber(quote.regularMarketChangePercent) ?? 0;

  const netIncomes = incomeStatements
    .map((row) => unwrapNumber(row.netIncome))
    .filter((value): value is number => value !== null && value > 0)
    .reverse();
  const revenues = incomeStatements
    .map((row) => unwrapNumber(row.totalRevenue))
    .filter((value): value is number => value !== null && value > 0)
    .reverse();

  let profitGrowth3Y: CheckResult;
  if (netIncomes.length >= 2) {
    const years = netIncomes.length - 1;
    const growth = cagr(netIncomes[0], netIncomes[netIncomes.length - 1], years);
    profitGrowth3Y = {
      pass: growth >= 15,
      label: '3 Year Profit Growth > 15%',
      value: `${growth.toFixed(1)}% CAGR`,
      detail: `Net income CAGR across ${years}Y: ${growth.toFixed(1)}%`,
    };
  } else {
    const earningsGrowth = unwrapNumber(fd?.earningsGrowth);
    profitGrowth3Y = {
      pass: earningsGrowth !== null ? earningsGrowth * 100 >= 15 : null,
      label: '3 Year Profit Growth > 15%',
      value: earningsGrowth !== null ? `${(earningsGrowth * 100).toFixed(1)}% YoY` : 'N/A',
      detail: earningsGrowth !== null
        ? `Fallback earnings growth from Yahoo Finance: ${(earningsGrowth * 100).toFixed(1)}%`
        : 'Insufficient historical profit data available',
    };
  }

  const operatingMargin = unwrapNumber(fd?.operatingMargins);
  let opmStable: CheckResult;
  if (operatingMargin !== null) {
    let stable = true;
    let note = 'Limited trend history available';
    if (netIncomes.length >= 3) {
      const growthRates: number[] = [];
      for (let i = 1; i < netIncomes.length; i++) {
        growthRates.push(((netIncomes[i] - netIncomes[i - 1]) / netIncomes[i - 1]) * 100);
      }
      stable = isStable(growthRates);
      note = `Profit growth variation ${(
        Math.max(...growthRates) - Math.min(...growthRates)
      ).toFixed(1)}pp`;
    }

    opmStable = {
      pass: stable && operatingMargin * 100 > 5,
      label: 'OPM is Stable',
      value: `${(operatingMargin * 100).toFixed(1)}%`,
      detail: `Operating margin ${(operatingMargin * 100).toFixed(1)}% | ${note}`,
    };
  } else {
    opmStable = {
      pass: null,
      label: 'OPM is Stable',
      value: 'N/A',
      detail: 'Operating margin data not available',
    };
  }

  const insiderHeld = unwrapNumber(majorHolders?.insidersPercentHeld);
  const promoterStakeStable: CheckResult = {
    pass: insiderHeld !== null ? insiderHeld * 100 >= 30 : null,
    label: 'Promoter Stake is Stable',
    value: insiderHeld !== null ? `${(insiderHeld * 100).toFixed(2)}%` : 'N/A',
    detail: insiderHeld !== null
      ? `Insider/promoter holding ${(insiderHeld * 100).toFixed(2)}%. Historical trend still needs manual verification.`
      : 'Not available from Yahoo Finance. Verify shareholding pattern manually.',
  };

  const epsQuarters = earningsHistory
    .map((row) => unwrapNumber(row.epsActual))
    .filter((value): value is number => value !== null);
  const trailingEps = unwrapNumber(ks?.trailingEps) ?? unwrapNumber(quote.epsTrailingTwelveMonths);
  const forwardEps = unwrapNumber(ks?.forwardEps) ?? unwrapNumber(quote.epsForward);
  let epsIncreasing: CheckResult;
  if (epsQuarters.length >= 3) {
    const trending = isTrendingUp(epsQuarters);
    const first = epsQuarters[0];
    const last = epsQuarters[epsQuarters.length - 1];
    const growth = first > 0 ? ((last - first) / first) * 100 : 0;
    epsIncreasing = {
      pass: trending,
      label: 'EPS is Increasing',
      value: trailingEps !== null ? `₹${trailingEps.toFixed(2)} TTM` : `₹${last.toFixed(2)}`,
      detail: `Quarterly EPS trend ${growth.toFixed(1)}% across the available history`,
    };
  } else if (trailingEps !== null && forwardEps !== null) {
    epsIncreasing = {
      pass: forwardEps > trailingEps,
      label: 'EPS is Increasing',
      value: `₹${trailingEps.toFixed(2)} → ₹${forwardEps.toFixed(2)}`,
      detail: `Forward EPS estimate ${forwardEps > trailingEps ? 'improves' : 'does not improve'} over trailing EPS`,
    };
  } else {
    epsIncreasing = {
      pass: null,
      label: 'EPS is Increasing',
      value: 'N/A',
      detail: 'Insufficient EPS history to determine trend',
    };
  }

  const checks = { profitGrowth3Y, opmStable, promoterStakeStable, epsIncreasing };
  const passCount = Object.values(checks).filter((check) => check.pass === true).length;
  const totalChecks = Object.values(checks).filter((check) => check.pass !== null).length;

  const revenueGrowth = unwrapNumber(fd?.revenueGrowth);
  const revenueCagr = revenues.length >= 2
    ? cagr(revenues[0], revenues[revenues.length - 1], revenues.length - 1)
    : null;
  const debtToEquity = normalizeDebtToEquity(unwrapNumber(fd?.debtToEquity));

  const advancedMetrics = {
    returnOnEquity: {
      pass: unwrapNumber(fd?.returnOnEquity) !== null ? (unwrapNumber(fd?.returnOnEquity) as number) * 100 >= 15 : null,
      label: 'Return on Equity',
      value: formatPercent(unwrapNumber(fd?.returnOnEquity), 100),
      benchmark: '> 15%',
      detail: 'Higher ROE usually signals stronger capital efficiency.',
    },
    debtToEquity: {
      pass: debtToEquity !== null ? debtToEquity <= 1 : null,
      label: 'Debt / Equity',
      value: debtToEquity !== null ? `${debtToEquity.toFixed(2)}x` : 'N/A',
      benchmark: '<= 1.0x',
      detail: 'Lower leverage leaves more room during downturns and rate cycles.',
    },
    revenueGrowth: {
      pass: revenueCagr !== null ? revenueCagr >= 10 : revenueGrowth !== null ? revenueGrowth * 100 >= 10 : null,
      label: 'Revenue Growth',
      value: revenueCagr !== null ? `${revenueCagr.toFixed(1)}% CAGR` : formatPercent(revenueGrowth, 100),
      benchmark: '> 10%',
      detail: revenueCagr !== null
        ? 'Derived from available income statement history.'
        : 'Fallback to Yahoo Finance revenue growth estimate.',
    },
    freeCashFlow: {
      pass: unwrapNumber(fd?.freeCashflow) !== null ? (unwrapNumber(fd?.freeCashflow) as number) > 0 : null,
      label: 'Free Cash Flow',
      value: formatCurrencyCompact(unwrapNumber(fd?.freeCashflow)),
      benchmark: 'Positive',
      detail: 'Positive free cash flow improves resilience during market drawdowns.',
    },
    currentRatio: {
      pass: unwrapNumber(fd?.currentRatio) !== null ? (unwrapNumber(fd?.currentRatio) as number) >= 1.25 : null,
      label: 'Current Ratio',
      value: unwrapNumber(fd?.currentRatio) !== null ? `${(unwrapNumber(fd?.currentRatio) as number).toFixed(2)}x` : 'N/A',
      benchmark: '>= 1.25x',
      detail: 'A stronger liquidity buffer can help operational flexibility.',
    },
  };

  const advancedPassCount = Object.values(advancedMetrics).filter((metric) => metric.pass === true).length;
  const advancedTotalChecks = Object.values(advancedMetrics).filter((metric) => metric.pass !== null).length;

  return {
    symbol,
    ticker,
    exchange,
    company_name: String(quote.longName || quote.shortName || symbol),
    last_price,
    week52High,
    week52Low,
    dropFromHigh,
    change,
    percent_change,
    sector: String(assetProfile?.sector || ''),
    industry: String(assetProfile?.industry || ''),
    checks,
    passCount,
    totalChecks,
    advancedMetrics,
    advancedPassCount,
    advancedTotalChecks,
  };
}
