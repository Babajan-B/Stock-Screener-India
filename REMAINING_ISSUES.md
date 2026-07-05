# StockIN — Remaining Production Hardening Issues

> Documented as of 2026-03-27. Priority 1 (rate limiting, sanitization, Cache-Control) completed. This file tracks Priority 2 (scaling/testing) and Priority 3 (nice-to-haves) for future iterations.

---

## Priority 2 — Should Fix Before Scaling

### P2-A: No Automated Tests

**Status:** ❌ Not started

**Impact:** Regressions go undetected; screener logic changes are risky.

**Solution:**
- Add Vitest unit tests for pure functions:
  - `lib/screenerRules.ts` — `buildScreenerAnalysis()` with mock quote/summary data
  - `lib/portfolioAnalytics.ts` — portfolio aggregation logic
  - `lib/reportBuilder.ts` — report generation logic
- Target 80%+ coverage
- Example test structure:
  ```ts
  describe('buildScreenerAnalysis', () => {
    it('should pass profit growth check when CAGR >= 15%', () => { ... });
    it('should fail OPM check when variation > 20%', () => { ... });
    it('should handle sparse income statement data', () => { ... });
  });
  ```

**Effort:** Medium (3-4 hours)

**Files to update:**
- Create `__tests__/screenerRules.test.ts`
- Create `__tests__/portfolioAnalytics.test.ts`
- Create `__tests__/reportBuilder.test.ts`
- Add `vitest` and `@testing-library/react` to dev dependencies
- Create `vitest.config.ts`

---

### P2-B: `/api/top-screener` Result Caching

**Status:** ❌ Not started

**Impact:** Running all 4 tabs consecutively fires 125+ Yahoo Finance calls in ~30 s. Wastes quota, slows UX.

**Solution:**
- Cache top-screener results server-side using Vercel KV (`@vercel/kv`)
- 10-minute TTL per cap tier (large/mid/small/micro)
- Key pattern: `top-screener:${cap}:v1` (v1 allows cache invalidation)
- Add cache hit/miss header to response

**Implementation sketch:**
```ts
import { kv } from '@vercel/kv';

export async function GET(req: NextRequest) {
  const cap = req.nextUrl.searchParams.get('cap') ?? 'large';
  const cacheKey = `top-screener:${cap}:v1`;

  // Check cache
  const cached = await kv.get(cacheKey);
  if (cached && !req.nextUrl.searchParams.has('force')) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'hit' }
    });
  }

  // Compute (existing logic)
  const results = await computeTopScreener(cap);

  // Store in cache
  await kv.setex(cacheKey, 600, results); // 10 min TTL

  return NextResponse.json(results, {
    headers: { 'X-Cache': 'miss' }
  });
}
```

**Effort:** Low (1-2 hours, includes Vercel KV setup)

**Files to update:**
- `app/api/top-screener/route.ts` — add caching logic
- Add `@vercel/kv` to dependencies
- Update `vercel.json` with KV binding (if needed)

---

### P2-C: Inconsistent Error Response Shape

**Status:** ⚠️ Partially done (some routes have proper shape, others don't)

**Impact:** Frontend error handling is fragile; inconsistent status codes.

**Solution:**
- Standardise all error responses to:
  ```json
  {
    "status": "error",
    "message": "Human-readable error",
    "code": "ERROR_CODE",
    "details": { ... }
  }
  ```
- Create error utility:
  ```ts
  // lib/apiErrors.ts
  export class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode: number = 400,
      public details?: Record<string, unknown>
    ) {
      super(message);
    }
  }

  export function errorResponse(error: ApiError): NextResponse {
    return NextResponse.json({
      status: 'error',
      code: error.code,
      message: error.message,
      details: error.details
    }, { status: error.statusCode });
  }
  ```
- Use in all routes:
  ```ts
  try {
    ...
  } catch (err) {
    throw new ApiError('FETCH_FAILED', `Stock not found: ${ticker}`, 404);
  }
  ```

**Effort:** Medium (2-3 hours)

**Files to update:**
- Create `lib/apiErrors.ts`
- Update all 10 API routes to use `ApiError` and `errorResponse()`

---

### P2-D: Scoped `maxDuration` in `vercel.json`

**Status:** ⚠️ Partially done (global 30s timeout, some routes don't need it)

**Impact:** Short routes like `/api/search` and `/api/symbols` are billed for full 30s on timeout.

**Solution:**
- Change global `maxDuration: 30` to per-route overrides:
  ```json
  {
    "functions": {
      "app/api/top-screener/route.ts": { "maxDuration": 30 },
      "app/api/compare/route.ts": { "maxDuration": 25 },
      "app/api/screener/route.ts": { "maxDuration": 15 },
      "app/api/stock/route.ts": { "maxDuration": 10 },
      "app/api/stock/list/route.ts": { "maxDuration": 10 },
      "app/api/search/route.ts": { "maxDuration": 5 },
      "app/api/symbols/route.ts": { "maxDuration": 3 }
    }
  }
  ```

**Effort:** Very Low (30 min, just config change)

**Files to update:**
- `vercel.json`

---

## Priority 3 — Nice-to-Have for v2

### P3-A: OpenTelemetry / Vercel Analytics

Add function latency tracking and error rate monitoring:
- Integrate Vercel Analytics SDK
- Track API response times per route
- Alert on 429 rate-limit hits

**Files:**
- `lib/telemetry.ts` — wrapper for `@vercel/analytics`

---

### P3-B: CSRF Protection on Future POST Routes

If portfolio upload, alerts, or watchlist sync become POST:
- Add CSRF token generation + validation
- Use `csrf` npm package or Next.js middleware

**Files:**
- `lib/csrf.ts` — token generation/validation
- `middleware.ts` — CSRF validation middleware

---

### P3-C: User Authentication (NextAuth)

For cloud watchlist/alerts sync:
- Add NextAuth with GitHub or Google provider
- Store watchlist + alerts in Supabase/PlanetScale instead of `localStorage`
- Add user-scoped API endpoints

**Files:**
- `app/api/auth/[...nextauth]/route.ts`
- Update watchlist/alerts storage from `localStorage` to DB calls
- Add auth guard middleware

---

### P3-D: Backtesting Endpoint

Did stocks that passed 4/4 checks actually recover after a 30%+ dip?
- Historical analysis: for each stock, check if it recovered 10% within 6 months of hitting dip
- `/api/backtest?startDate=2023-01&endDate=2024-12`

**Files:**
- `app/api/backtest/route.ts`
- `lib/backtestEngine.ts`

---

### P3-E: PWA (Progressive Web App)

Offline support + add-to-home-screen:
- Add `manifest.json`
- Create service worker (`public/sw.js`)
- Cache API responses + static assets

**Files:**
- `public/manifest.json`
- `public/sw.js`
- `app/layout.tsx` — add manifest link

---

### P3-F: Internationalisation (i18n)

English + Hindi initial targets:
- Add `next-intl` package
- Translate UI strings, sector names, error messages
- Language selector in navbar

**Files:**
- `lib/i18n/en.json`
- `lib/i18n/hi.json`
- `i18n.config.ts`
- Update all pages + components for i18n keys

---

## Recommended Implementation Order

**Next Session (P2):**
1. **P2-D** (easiest, 30 min) — scope `maxDuration` in `vercel.json`
2. **P2-C** (medium, 2-3 hrs) — standardise error responses
3. **P2-B** (medium, 1-2 hrs) — add Vercel KV caching to top-screener
4. **P2-A** (hardest, 3-4 hrs) — add Vitest unit tests

**Future Sessions (P3):**
- Start with **P3-C** (auth) if user persistence is needed
- **P3-E** (PWA) for mobile experience
- **P3-F** (i18n) for broader reach
- **P3-A** (telemetry) when monitoring is critical
- **P3-D** (backtesting) as a novel feature differentiator

---

*Last updated: 2026-03-27*
