import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/yf';

// Shared screener logic (must mirror /api/screener)
async function screenOne(symbol: string): Promise<Record<string, unknown> | null> {
  const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`;
  try {
    const [quote, summary] = await Promise.all([
      yf.quote(ticker),
      yf.quoteSummary(ticker, {
        modules: [
          'financialData', 'defaultKeyStatistics', 'incomeStatementHistory',
          'earningsHistory', 'majorHoldersBreakdown', 'assetProfile',
          'institutionOwnership',
        ] as never,
      }),
    ]);

    const fd  = (summary as Record<string, unknown>).financialData  as Record<string, unknown> | undefined;
    const dks = (summary as Record<string, unknown>).defaultKeyStatistics as Record<string, unknown> | undefined;
    const ish = (summary as Record<string, unknown>).incomeStatementHistory as { incomeStatementHistory?: Array<Record<string,unknown>> } | undefined;
    const eh  = (summary as Record<string, unknown>).earningsHistory as { history?: Array<Record<string,unknown>> } | undefined;
    const mhb = (summary as Record<string, unknown>).majorHoldersBreakdown as Record<string, unknown> | undefined;
    const ap  = (summary as Record<string, unknown>).assetProfile as Record<string, unknown> | undefined;

    const lastPrice  = (quote as Record<string,unknown>).regularMarketPrice  as number | undefined;
    const week52High = (quote as Record<string,unknown>).fiftyTwoWeekHigh    as number | undefined;
    const week52Low  = (quote as Record<string,unknown>).fiftyTwoWeekLow     as number | undefined;

    if (!lastPrice || !week52High) return null;
    const dropFromHigh = ((lastPrice - week52High) / week52High) * 100;

    // ── Check 1: 3Y Profit Growth > 15% ──────────────────────────────────
    const stmts = ish?.incomeStatementHistory ?? [];
    let profitGrowthPass = false;
    let profitGrowthVal  = 'N/A';
    if (stmts.length >= 2) {
      const recent = (stmts[0] as Record<string,(number|Record<string,number>)>).netIncome;
      const older  = (stmts[Math.min(2, stmts.length - 1)] as Record<string,(number|Record<string,number>)>).netIncome;
      const r = typeof recent === 'object' && recent !== null ? (recent as Record<string,number>).raw : recent as number;
      const o = typeof older  === 'object' && older  !== null ? (older  as Record<string,number>).raw : older  as number;
      if (r && o && o > 0) {
        const years = Math.min(2, stmts.length - 1);
        const cagr  = (Math.pow(r / o, 1 / years) - 1) * 100;
        profitGrowthPass = cagr >= 15;
        profitGrowthVal  = `${cagr.toFixed(1)}% CAGR`;
      }
    }
    if (!profitGrowthPass && fd) {
      const eg = fd.earningsGrowth as number | undefined;
      if (eg != null) {
        profitGrowthPass = eg * 100 >= 15;
        if (profitGrowthVal === 'N/A') profitGrowthVal = `${(eg * 100).toFixed(1)}%`;
      }
    }

    // ── Check 2: OPM Stable ───────────────────────────────────────────────
    const opm = fd?.operatingMargins as number | undefined;
    const opmStablePass = opm != null && opm > 0;
    const opmVal = opm != null ? `${(opm * 100).toFixed(1)}%` : 'N/A';

    // ── Check 3: Promoter Stake Stable (>30%) ────────────────────────────
    const ins = mhb?.insidersPercentHeld as number | undefined;
    const promoterPass = ins != null && ins >= 0.3;
    const promoterVal  = ins != null ? `${(ins * 100).toFixed(1)}%` : 'N/A';

    // ── Check 4: EPS Increasing ───────────────────────────────────────────
    const hist = eh?.history ?? [];
    let epsPass = false;
    let epsVal  = 'N/A';
    if (hist.length >= 2) {
      const vals = hist
        .map(h => {
          const v = (h as Record<string, unknown>).epsActual;
          return typeof v === 'object' && v !== null ? (v as Record<string,number>).raw : v as number;
        })
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
        .slice(-4);
      if (vals.length >= 2) {
        epsPass = vals[vals.length - 1] > vals[0];
        epsVal  = `₹${vals[vals.length - 1].toFixed(2)}`;
      }
    }
    if (!epsPass && dks) {
      const te = dks.trailingEps as number | undefined;
      const fe = dks.forwardEps  as number | undefined;
      if (te != null && fe != null) {
        epsPass = fe > te;
        if (epsVal === 'N/A') epsVal = `₹${te.toFixed(2)} → ₹${fe.toFixed(2)}`;
      }
    }

    const passCount = [profitGrowthPass, opmStablePass, promoterPass, epsPass].filter(Boolean).length;

    return {
      symbol:      symbol,
      company_name: (quote as Record<string,unknown>).longName ?? (quote as Record<string,unknown>).shortName ?? symbol,
      last_price:  lastPrice,
      week52High,
      week52Low,
      dropFromHigh: parseFloat(dropFromHigh.toFixed(2)),
      marketCap:   (quote as Record<string,unknown>).marketCap,
      sector:      ap?.sector ?? '',
      checks: {
        profitGrowth3Y:       { pass: profitGrowthPass, value: profitGrowthVal },
        opmStable:            { pass: opmStablePass,    value: opmVal          },
        promoterStakeStable:  { pass: promoterPass,     value: promoterVal     },
        epsIncreasing:        { pass: epsPass,           value: epsVal          },
      },
      passCount,
      totalChecks: 4,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const cap = req.nextUrl.searchParams.get('cap') ?? 'large';

  const { LARGE_CAP, MID_CAP, SMALL_CAP, MICRO_CAP } = await import('@/lib/capStocks');
  const pool: Record<string, string[]> = {
    large: LARGE_CAP,
    mid:   MID_CAP,
    small: SMALL_CAP,
    micro: MICRO_CAP,
  };
  const symbols = pool[cap] ?? LARGE_CAP;

  // Screen in batches of 5 concurrently to keep latency bearable
  const BATCH = 5;
  const results: ReturnType<typeof screenOne> extends Promise<infer T> ? T[] : never[] = [];
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = await Promise.all(symbols.slice(i, i + BATCH).map(screenOne));
    results.push(...batch.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof screenOne>>>[]);
  }

  // Sort by passCount desc, then by abs(dropFromHigh) desc (bigger dip = more interesting)
  const sorted = (results as Array<Record<string, unknown>>).sort((a, b) => {
    const pc = (b.passCount as number) - (a.passCount as number);
    if (pc !== 0) return pc;
    return Math.abs(b.dropFromHigh as number) - Math.abs(a.dropFromHigh as number);
  });

  return NextResponse.json({ status: 'success', cap, results: sorted.slice(0, 20) });
}
