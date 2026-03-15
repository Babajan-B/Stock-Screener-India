export type PortfolioRecommendation = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';

export interface PortfolioAnalyticsInput {
  symbol: string;
  qty?: number;
  buyPrice?: number;
  pnlPct?: number;
  recommendation?: PortfolioRecommendation;
  screener?: {
    company_name: string;
    last_price: number;
    sector?: string;
    passCount: number;
    totalChecks: number;
    advancedPassCount?: number;
    advancedTotalChecks?: number;
  };
}

export interface PortfolioAnalytics {
  analyzedHoldings: number;
  positionsWithQuantity: number;
  positionsWithCostBasis: number;
  exposureBasis: 'value' | 'position';
  investedValue: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number | null;
  avgCoreScore: number | null;
  avgAdvancedScore: number | null;
  recommendationBreakdown: Record<PortfolioRecommendation, number>;
  sectorExposure: Array<{
    sector: string;
    value: number;
    weight: number;
    positions: number;
  }>;
  allocations: Array<{
    symbol: string;
    companyName: string;
    value: number;
    weight: number;
  }>;
  concentration: {
    topHoldingSymbol: string | null;
    topHoldingWeight: number | null;
    topThreeWeight: number | null;
  };
  bestPerformer: {
    symbol: string;
    pnlPct: number;
  } | null;
  worstPerformer: {
    symbol: string;
    pnlPct: number;
  } | null;
}

export function computePortfolioAnalytics(
  rows: PortfolioAnalyticsInput[]
): PortfolioAnalytics {
  const analyzed = rows.filter((row) => row.screener);
  const recommendationBreakdown: Record<PortfolioRecommendation, number> = {
    'Strong Buy': 0,
    Buy: 0,
    Hold: 0,
    Sell: 0,
  };

  let investedValue = 0;
  let currentValue = 0;
  let positionsWithQuantity = 0;
  let positionsWithCostBasis = 0;
  let coreScoreSum = 0;
  let coreScoreCount = 0;
  let advancedScoreSum = 0;
  let advancedScoreCount = 0;

  const allocationMap = new Map<string, { companyName: string; value: number }>();
  const sectorMap = new Map<string, { value: number; positions: number }>();
  const pnlRows: Array<{ symbol: string; pnlPct: number }> = [];

  for (const row of analyzed) {
    const screener = row.screener!;
    const positionValue = row.qty ? row.qty * screener.last_price : 1;
    const basis = row.qty && row.buyPrice ? row.qty * row.buyPrice : 0;
    const sector = screener.sector?.trim() || 'Unclassified';

    if (row.qty) {
      positionsWithQuantity += 1;
      currentValue += positionValue;
    }
    if (row.qty && row.buyPrice) {
      positionsWithCostBasis += 1;
      investedValue += basis;
    }
    if (row.recommendation) {
      recommendationBreakdown[row.recommendation] += 1;
    }

    coreScoreSum += screener.passCount / Math.max(screener.totalChecks || 1, 1);
    coreScoreCount += 1;

    if (
      typeof screener.advancedPassCount === 'number' &&
      typeof screener.advancedTotalChecks === 'number' &&
      screener.advancedTotalChecks > 0
    ) {
      advancedScoreSum += screener.advancedPassCount / screener.advancedTotalChecks;
      advancedScoreCount += 1;
    }

    const existingAllocation = allocationMap.get(row.symbol) ?? {
      companyName: screener.company_name,
      value: 0,
    };
    existingAllocation.value += positionValue;
    allocationMap.set(row.symbol, existingAllocation);

    const existingSector = sectorMap.get(sector) ?? { value: 0, positions: 0 };
    existingSector.value += positionValue;
    existingSector.positions += 1;
    sectorMap.set(sector, existingSector);

    if (typeof row.pnlPct === 'number') {
      pnlRows.push({ symbol: row.symbol, pnlPct: row.pnlPct });
    }
  }

  const exposureBasis: 'value' | 'position' = positionsWithQuantity > 0 ? 'value' : 'position';
  const totalExposure = exposureBasis === 'value'
    ? currentValue
    : analyzed.length;

  const allocations = [...allocationMap.entries()]
    .map(([symbol, item]) => ({
      symbol,
      companyName: item.companyName,
      value: item.value,
      weight: totalExposure > 0 ? (item.value / totalExposure) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const sectorExposure = [...sectorMap.entries()]
    .map(([sector, item]) => ({
      sector,
      value: item.value,
      positions: item.positions,
      weight: totalExposure > 0 ? (item.value / totalExposure) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const topHolding = allocations[0];
  const topThreeWeight = allocations.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const bestPerformer = pnlRows.length
    ? [...pnlRows].sort((a, b) => b.pnlPct - a.pnlPct)[0]
    : null;
  const worstPerformer = pnlRows.length
    ? [...pnlRows].sort((a, b) => a.pnlPct - b.pnlPct)[0]
    : null;

  const unrealizedPnL = positionsWithCostBasis > 0 ? currentValue - investedValue : 0;
  const unrealizedPnLPct = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : null;

  return {
    analyzedHoldings: analyzed.length,
    positionsWithQuantity,
    positionsWithCostBasis,
    exposureBasis,
    investedValue,
    currentValue,
    unrealizedPnL,
    unrealizedPnLPct,
    avgCoreScore: coreScoreCount > 0 ? (coreScoreSum / coreScoreCount) * 100 : null,
    avgAdvancedScore: advancedScoreCount > 0 ? (advancedScoreSum / advancedScoreCount) * 100 : null,
    recommendationBreakdown,
    sectorExposure,
    allocations,
    concentration: {
      topHoldingSymbol: topHolding?.symbol ?? null,
      topHoldingWeight: topHolding ? topHolding.weight : null,
      topThreeWeight: allocations.length ? topThreeWeight : null,
    },
    bestPerformer,
    worstPerformer,
  };
}
