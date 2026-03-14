import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';

export interface CheckResult {
  pass: boolean | null; // null = cannot determine
  label: string;
  detail: string;
  value: string;
  rawData?: Record<string, unknown>;
}

export interface ScreenerResult {
  status: 'success' | 'error';
  symbol: string;
  ticker: string;
  exchange: string;
  company_name: string;
  last_price: number;
  week52High: number;
  week52Low: number;
  dropFromHigh: number; // negative %, e.g. -35
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
  timestamp: string;
  message?: string;
}

// Calculate CAGR (Compound Annual Growth Rate)
function cagr(start: number, end: number, years: number): number {
  if (!start || start <= 0 || !end || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

// Check if a series is trending up (monotonically or generally increasing)
function isTrendingUp(values: number[]): boolean {
  if (values.length < 2) return false;
  let increases = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increases++;
  }
  return increases >= values.length - 1; // all or all-but-one must increase
}

// Check standard deviation / stability of OPM
function isStable(values: number[]): boolean {
  if (values.length < 2) return true;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 100;
  return coeffVar < 20; // < 20% coefficient of variation is "stable"
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = searchParams.get('symbol') || '';

  if (!symbolRaw) {
    return NextResponse.json({ status: 'error', message: 'symbol is required' }, { status: 400 });
  }

  let ticker = symbolRaw.toUpperCase();
  const exchange = ticker.endsWith('.BO') ? 'BSE' : 'NSE';
  if (!ticker.endsWith('.NS') && !ticker.endsWith('.BO')) {
    ticker = `${ticker}.NS`;
  }
  const symbol = ticker.replace(/\.(NS|BO)$/, '');

  try {
    const [quoteResult, summaryResult] = await Promise.allSettled([
      yf.quote(ticker),
      yf.quoteSummary(ticker, {
        modules: [
          'financialData',
          'defaultKeyStatistics',
          'incomeStatementHistory',
          'earningsHistory',
          'majorHoldersBreakdown',
          'assetProfile',
        ],
      }),
    ]);

    if (quoteResult.status === 'rejected') {
      return NextResponse.json({
        status: 'error',
        message: `No data found for ${ticker}. Check the symbol and try again.`,
      }, { status: 404 });
    }

    const q = quoteResult.value as Record<string, unknown>;
    const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

    const fd = summary?.financialData as Record<string, unknown> | undefined;
    const ks = summary?.defaultKeyStatistics as Record<string, unknown> | undefined;
    const isl = (summary?.incomeStatementHistory as Record<string, unknown[]> | undefined)
      ?.incomeStatementHistory as Array<Record<string, unknown>> | undefined;
    const ehHistory = (summary?.earningsHistory as Record<string, unknown> | undefined)
      ?.history as Array<Record<string, unknown>> | undefined;
    const majorHolders = summary?.majorHoldersBreakdown as Record<string, unknown> | undefined;
    const ap = summary?.assetProfile as Record<string, unknown> | undefined;

    const last_price = (q.regularMarketPrice as number) ?? 0;
    const week52High = (q.fiftyTwoWeekHigh as number) ?? 0;
    const week52Low = (q.fiftyTwoWeekLow as number) ?? 0;
    const dropFromHigh = week52High > 0 ? ((last_price - week52High) / week52High) * 100 : 0;

    // ──────────────────────────────────────────────
    // CHECK 1: 3-Year Profit Growth > 15%
    // ──────────────────────────────────────────────
    let profitGrowth3Y: CheckResult;
    const netIncomes = (isl ?? [])
      .map(y => y.netIncome as number)
      .filter(v => v && v > 0)
      .reverse(); // oldest first

    if (netIncomes.length >= 2) {
      const years = netIncomes.length - 1; // e.g. 3 years if 4 data points
      const cagrValue = cagr(netIncomes[0], netIncomes[netIncomes.length - 1], years);
      const pass = cagrValue >= 15;
      const formattedIncs = netIncomes
        .map(v => `₹${(v / 1e9).toFixed(0)}B`)
        .join(' → ');
      profitGrowth3Y = {
        pass,
        label: '3 Year Profit Growth > 15%',
        value: `${cagrValue.toFixed(1)}% CAGR`,
        detail: `Net income ${years}Y CAGR: ${cagrValue.toFixed(1)}%  |  ${formattedIncs}`,
      };
    } else {
      // Fallback: use earningsGrowth from financialData
      const eg = (fd?.earningsGrowth as number) ?? null;
      if (eg !== null) {
        const cagrValue = eg * 100;
        profitGrowth3Y = {
          pass: cagrValue >= 15,
          label: '3 Year Profit Growth > 15%',
          value: `${cagrValue.toFixed(1)}% YoY`,
          detail: `Yahoo Finance reported earnings growth: ${cagrValue.toFixed(1)}% (YoY estimate)`,
        };
      } else {
        profitGrowth3Y = {
          pass: null,
          label: '3 Year Profit Growth > 15%',
          value: 'N/A',
          detail: 'Insufficient historical profit data available from Yahoo Finance',
        };
      }
    }

    // ──────────────────────────────────────────────
    // CHECK 2: OPM is Stable
    // ──────────────────────────────────────────────
    let opmStable: CheckResult;
    const currentOPM = (fd?.operatingMargins as number) ?? null;

    if (currentOPM !== null) {
      // Derive stability from net income trend (if net income grows steadily → OPM stable proxy)
      const opmPct = (currentOPM * 100);
      let stable = true;
      let stabilityNote = '';

      if (netIncomes.length >= 3) {
        // Check if net income growth is consistent (proxy for OPM stability)
        const growthRates: number[] = [];
        for (let i = 1; i < netIncomes.length; i++) {
          growthRates.push(((netIncomes[i] - netIncomes[i - 1]) / netIncomes[i - 1]) * 100);
        }
        stable = isStable(growthRates);
        const avg = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
        const variation = Math.max(...growthRates) - Math.min(...growthRates);
        stabilityNote = `Profit growth variance: ${variation.toFixed(1)}pp  |  Avg: ${avg.toFixed(1)}%/yr`;
      } else {
        stabilityNote = 'Insufficient historical data for full trend analysis';
      }

      opmStable = {
        pass: stable && opmPct > 5,
        label: 'OPM is Stable',
        value: `${opmPct.toFixed(1)}%`,
        detail: `Current Operating Profit Margin: ${opmPct.toFixed(1)}%  |  ${stabilityNote}`,
      };
    } else {
      opmStable = {
        pass: null,
        label: 'OPM is Stable',
        value: 'N/A',
        detail: 'Operating margin data not available',
      };
    }

    // ──────────────────────────────────────────────
    // CHECK 3: Promoter Stake is Stable
    // ──────────────────────────────────────────────
    // Yahoo Finance provides insidersPercentHeld — for Indian cos this is typically promoter group
    let promoterStakeStable: CheckResult;
    const insiderHeld = (majorHolders?.insidersPercentHeld as number) ?? null;

    if (insiderHeld !== null) {
      const pct = insiderHeld * 100;
      promoterStakeStable = {
        pass: pct >= 30, // >30% is generally considered meaningful promoter stake
        label: 'Promoter Stake is Stable',
        value: `${pct.toFixed(2)}%`,
        detail: `Insider/Promoter holding: ${pct.toFixed(2)}%  |  ⚠ Historical trend requires manual verification on BSE/NSE disclosures. A reading above 30% indicates skin-in-the-game.`,
      };
    } else {
      promoterStakeStable = {
        pass: null,
        label: 'Promoter Stake is Stable',
        value: 'N/A',
        detail: '⚠ Not available from Yahoo Finance. Verify manually at screener.in or BSE India shareholding pattern.',
      };
    }

    // ──────────────────────────────────────────────
    // CHECK 4: EPS is Increasing
    // ──────────────────────────────────────────────
    let epsIncreasing: CheckResult;
    const epsQuarters = (ehHistory ?? [])
      .map(q => q.epsActual as number)
      .filter(v => v !== null && v !== undefined);

    const trailingEps = (ks?.trailingEps as number) ?? (q.epsTrailingTwelveMonths as number) ?? null;
    const forwardEps = (ks?.forwardEps as number) ?? (q.epsForward as number) ?? null;

    if (epsQuarters.length >= 3) {
      const trending = isTrendingUp(epsQuarters);
      const first = epsQuarters[0];
      const last = epsQuarters[epsQuarters.length - 1];
      const totalGrowth = first > 0 ? ((last - first) / first) * 100 : 0;
      const qLabels = epsQuarters.map((v, i) => `Q-${epsQuarters.length - i}: ₹${v.toFixed(2)}`).join(' → ');
      epsIncreasing = {
        pass: trending,
        label: 'EPS is Increasing',
        value: trailingEps ? `₹${trailingEps.toFixed(2)} TTM` : `₹${last.toFixed(2)}`,
        detail: `Quarterly EPS: ${qLabels}  |  Growth: ${totalGrowth.toFixed(1)}% over period`,
      };
    } else if (trailingEps !== null && forwardEps !== null) {
      const pass = forwardEps > trailingEps;
      epsIncreasing = {
        pass,
        label: 'EPS is Increasing',
        value: `₹${trailingEps.toFixed(2)} TTM`,
        detail: `Trailing EPS: ₹${trailingEps.toFixed(2)}  |  Forward EPS: ₹${forwardEps.toFixed(2)}  |  ${pass ? '▲ Forward estimate higher' : '▼ Forward estimate lower'}`,
      };
    } else {
      epsIncreasing = {
        pass: null,
        label: 'EPS is Increasing',
        value: 'N/A',
        detail: 'Insufficient EPS history to determine trend',
      };
    }

    // Count passes
    const checks = { profitGrowth3Y, opmStable, promoterStakeStable, epsIncreasing };
    const passCount = Object.values(checks).filter(c => c.pass === true).length;
    const totalChecks = Object.values(checks).filter(c => c.pass !== null).length;

    const result: ScreenerResult = {
      status: 'success',
      symbol,
      ticker,
      exchange,
      company_name: (q.longName as string) || (q.shortName as string) || symbol,
      last_price,
      week52High,
      week52Low,
      dropFromHigh,
      change: (q.regularMarketChange as number) ?? 0,
      percent_change: (q.regularMarketChangePercent as number) ?? 0,
      sector: (ap?.sector as string) ?? '',
      industry: (ap?.industry as string) ?? '',
      checks,
      passCount,
      totalChecks,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
