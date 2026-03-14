# StockIN — Full Project Documentation

> A real-time Indian stock market web application: dashboard, screener, portfolio analyser, and cap-wise rankings — powered by Next.js 16 and Yahoo Finance data.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Architecture](#4-architecture)
5. [Technology Decisions](#5-technology-decisions)
6. [Feature Deep-Dives](#6-feature-deep-dives)
   - 6.1 [Dashboard](#61-dashboard)
   - 6.2 [Stock Detail Page](#62-stock-detail-page)
   - 6.3 [Watchlist](#63-watchlist)
   - 6.4 [Stock Dip Analyser (Screener)](#64-stock-dip-analyser-screener)
   - 6.5 [Portfolio Analyser](#65-portfolio-analyser)
   - 6.6 [Top Rankings](#66-top-rankings)
7. [API Layer](#7-api-layer)
8. [Data Flow](#8-data-flow)
9. [Screener Logic — Technical Breakdown](#9-screener-logic--technical-breakdown)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Challenges & Solutions](#12-challenges--solutions)
13. [Known Limitations](#13-known-limitations)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Project Vision

StockIN was built to answer a single practical question every retail investor in India faces:

> *"My stock is down 40% — should I buy more, hold, or cut my losses?"*

Most retail investors either panic-sell at the bottom or average down into a fundamentally broken business. The app provides a systematic, data-driven 4-point checklist to separate temporary price dips (buying opportunities) from structural business deterioration (traps).

Beyond the screener, the project grew into a complete stock market companion: live prices, stock fundamentals, a personal watchlist, CSV-based portfolio analysis, and ranked lists of the best-scoring stocks by market cap category.

---

## 2. Problem Statement

### The Indian Retail Investor's Dilemma

India's retail participation in equity markets has exploded since 2020. Millions of new investors entered through platforms like Zerodha, Groww, and Upstox — many without a structured way to evaluate whether a falling stock is worth holding.

**The specific pain points this app addresses:**

| Pain Point | How StockIN Solves It |
|---|---|
| "Is this dip a buy or a trap?" | 4-point screener gives a structured pass/fail verdict |
| "What's happening to my whole portfolio?" | CSV upload analyses every holding in one batch |
| "Which stocks are worth watching right now?" | Rankings page shows top screener scores by cap tier |
| "I don't know the ticker symbol" | Company-name autocomplete on every search field |
| "I need both NSE and BSE prices" | Stock detail page shows both with a tab switcher |

---

## 3. Solution Overview

### Application Pages

```
/ ..................... Dashboard — live market overview (20 stocks)
/stock/[symbol] ...... Stock detail — full fundamentals + range bars
/watchlist ........... Personal watchlist with live cards
/screener ............ 4-point Dip Analyser with autocomplete
/portfolio ........... Broker CSV upload → portfolio-wide signals
/top-screener ........ Cap-wise rankings: Large / Mid / Small / Micro
```

### Key Design Principles

1. **No authentication** — everything works anonymously; watchlist uses `localStorage`
2. **No paid API** — all data from Yahoo Finance via `yahoo-finance2`
3. **Server-side data fetching** — API routes live on Vercel serverless functions; the browser never calls Yahoo Finance directly
4. **Progressive disclosure** — basic info visible at a glance; detail on click/expand
5. **Mobile-first** — responsive at every breakpoint; Navbar collapses search on mobile

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                    │
│  React 19 · Tailwind CSS · Lucide Icons · localStorage  │
└───────────────────────┬─────────────────────────────────┘
                        │ fetch()
┌───────────────────────▼─────────────────────────────────┐
│              Next.js 16 App Router (Vercel)             │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ /api/stock  │  │ /api/screener│  │/api/top-screen│  │
│  │ /api/search │  │ /api/symbols │  │/api/stock/list│  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                │                 │            │
│  ┌──────▼────────────────▼─────────────────▼─────────┐  │
│  │            lib/yf.ts  (yahoo-finance2 singleton)  │  │
│  └───────────────────────┬───────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│                   Yahoo Finance API                     │
│      (quote · quoteSummary · search · historical)       │
└─────────────────────────────────────────────────────────┘
```

### Why a Singleton?

`yahoo-finance2` v3 requires instantiation via `new YahooFinance()`. If each API route imported and instantiated it independently, Vercel's serverless cold starts would create multiple instances with overlapping notice-suppression state. The singleton at `lib/yf.ts` ensures one shared instance:

```ts
// lib/yf.ts
import YahooFinance from 'yahoo-finance2';
export const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
```

---

## 5. Technology Decisions

### Next.js 16 App Router

Chosen over Pages Router for:
- **Collocated API routes** — `app/api/screener/route.ts` next to `app/screener/page.tsx`
- **Server Components by default** — pages that don't need interactivity render server-side
- **Turbopack** — faster local dev HMR (used in dev mode)
- **`serverExternalPackages`** — allows `yahoo-finance2` to remain as a true Node.js external and not get bundled

### yahoo-finance2 (v3) vs External API

The original plan used a third-party REST API hosted on Koyeb (`0xramm/Indian-Stock-Market-API`). This was abandoned because:
- The Koyeb service was terminated (404 on all endpoints)
- `yahoo-finance2` provides the same data with zero hosting cost
- All data fetching happens server-side — no CORS issues, no API key to manage

### Tailwind CSS with Inline Style Overrides

Tailwind handles layout, spacing, and animation (`animate-spin`, `animate-pulse`). Dynamic colours (e.g. red/green/yellow based on pass/fail state) use inline `style` props rather than dynamic class names. This is intentional: Tailwind's JIT compiler purges classes that don't appear as complete, static strings in the source. Computed class names like `` `text-${color}` `` get purged in production. Inline styles bypass this entirely and produce more reliable builds.

### No Database

There was no requirement for user accounts or server-side state. Watchlists are stored in `localStorage` under the key `stockin_watchlist`. This gives instant persistence with zero backend complexity and works offline.

---

## 6. Feature Deep-Dives

### 6.1 Dashboard

**File:** `app/page.tsx`

The dashboard fetches 20 curated NSE symbols (defined in `lib/types.ts` as `POPULAR_STOCKS`) in two parallel batches of 10 via `/api/stock/list`. Batching prevents the API route from making 20 simultaneous Yahoo Finance requests, which can trigger rate limiting.

**Key interactions:**
- **Grid / Table toggle** — grid for visual scanning, table for sorting
- **Gainers / Losers / All filter** — client-side filter on `percent_change`
- **Sort by column** — symbol, price, change, market cap
- **Auto-refresh** — `setInterval` every 60 seconds re-fetches all 20 stocks
- **Stat cards** — total gainers, total losers, top gainer name+%, top loser name+%

### 6.2 Stock Detail Page

**File:** `app/stock/[symbol]/page.tsx`

Fetches both `.NS` (NSE) and `.BO` (BSE) variants simultaneously using `Promise.all`. Whichever resolves first populates the default view; the other is available via the NSE/BSE tab switcher.

**Sections rendered:**
1. **Hero** — company name, symbol, exchange badge, current price, day change
2. **Day's Range bar** — gradient bar showing where today's price sits between the day's low and high
3. **52-Week Range bar** — same visual treatment for the annual range
4. **Trading Info** — volume, market cap, P/E ratio, dividend yield
5. **Fundamentals** — EPS (TTM), book value, price-to-book
6. **Company Info** — sector, industry, full business description (truncated with expand)

### 6.3 Watchlist

**File:** `app/watchlist/page.tsx`

On mount, reads `localStorage` key `stockin_watchlist`. If absent, seeds with `['RELIANCE','TCS','HDFCBANK','INFY','ITC','SBIN']`. Fetches live data for all symbols via `/api/stock/list`.

**Add flow:** User types a symbol → validates it by calling `/api/stock?symbol=X` → if 200 OK, appends to the list and writes back to `localStorage`.

**Remove flow:** Hovering a card reveals an `×` button in the top-right corner. Click removes from state and `localStorage`.

### 6.4 Stock Dip Analyser (Screener)

**File:** `app/screener/page.tsx` + `app/api/screener/route.ts`

The flagship feature. See [Section 9](#9-screener-logic--technical-breakdown) for the full technical breakdown of the 4 checks.

**UX flow:**
1. User types a company name or symbol in the autocomplete input
2. After 2 characters, a **300ms debounced** `fetch` to `/api/search` fires
3. Results are deduplicated by symbol (Yahoo Finance sometimes returns duplicates) and shown in a dropdown
4. Selecting a suggestion fills the input and immediately triggers analysis
5. `/api/screener?symbol=X` is called — response populates the result panel
6. **Score ring** shows X/4 with colour coding (green ≥75%, yellow ≥50%, red <50%)
7. **4 check cards** are collapsible — clicking reveals the raw detail string and the criterion description
8. **Verdict banner** at the bottom summarises: Strong Buy / Partial Match / Not in Zone / Risky

**Quick picks** row below the search shows 10 popular stocks as one-tap shortcuts.

### 6.5 Portfolio Analyser

**File:** `app/portfolio/page.tsx`

**CSV parsing pipeline:**

```
Raw CSV text
  → split by \r?\n (handles Windows/Mac line endings)
  → parse headers (strip spaces, hyphens, special chars, lowercase)
  → match headers against candidate arrays:
       symbol:   ['instrument','symbol','stock','scrip','tradingsymbol','ticker']
       qty:      ['qty','quantity','shares','units','holdingqty']
       buyPrice: ['avgcost','averagebuyprice','buyprice','avgprice','purchaseprice','costprice']
  → for each row: cleanSymbol() strips exchange suffixes
       e.g. RELIANCE-EQ → RELIANCE
            RELIANCE:NSE → RELIANCE
            RELIANCE.NS  → RELIANCE
  → deduplicate by symbol
```

**Analysis pipeline:**

```
for each unique symbol (batches of 3, 700ms between batches):
  → fetch /api/screener?symbol=X
  → on success: compute recommendation + P&L%
  → update state row-by-row (live progress visible)

Recommendation logic:
  pass ≥ 3 AND drop ≥ 20%  → Strong Buy
  pass ≥ 2 AND drop ≥ 10%  → Buy
  pass ≥ 2                  → Hold
  else                      → Sell
```

**Why batches of 3?** Yahoo Finance has undocumented rate limits. In testing, bursts of 5+ simultaneous requests occasionally returned 429s or incomplete data. Batches of 3 with a 700ms delay stay well within safe limits.

**Export:** The "Export CSV" button generates a Blob URL download with all analysis columns: Symbol, Company, Qty, Buy Price, CMP, P&L%, Drop from 52W High, Score, Recommendation.

### 6.6 Top Rankings

**File:** `app/top-screener/page.tsx` + `app/api/top-screener/route.ts`

**Stock pools** (defined in `lib/capStocks.ts`):

| Cap | Pool | Basis |
|---|---|---|
| Large | 40 symbols | Nifty 50 + Nifty Next 50 core |
| Mid | 30 symbols | Nifty Midcap 150 representation |
| Small | 30 symbols | Nifty Smallcap 250 representation |
| Micro | 25 symbols | Emerging / recently listed names |

**Server-side processing:**
1. `screenOne(symbol)` — reusable async function that calls `yf.quote()` + `yf.quoteSummary()` and runs the 4 checks
2. Pool screened in batches of 5
3. Sorted: `passCount DESC`, then `|dropFromHigh| DESC`
4. Top 20 returned

**Client-side caching:**
```ts
const STALE_MS = 5 * 60 * 1000; // 5 minutes
if (!force && cache[cap] && (Date.now() - lastFetched[cap]) < STALE_MS) return;
```
Tabs that have already been fetched within 5 minutes don't re-fetch. The Refresh button forces a re-fetch regardless.

**Row expansion:** Clicking any row expands it to show 4 check cards + a 52-week range bar inline. This keeps the table scannable while allowing drill-down.

---

## 7. API Layer

All API routes are Next.js route handlers (`app/api/*/route.ts`). They run as Node.js serverless functions on Vercel.

### Route Summary

| Route | Method | Key Yahoo Finance calls | Purpose |
|---|---|---|---|
| `/api/stock` | GET | `yf.quote()` + `yf.quoteSummary(summaryDetail, defaultKeyStatistics, assetProfile)` | Single stock full data |
| `/api/stock/list` | GET | `yf.quote()` per symbol via `Promise.allSettled` | Batch quotes |
| `/api/search` | GET | `yf.search(q, { newsCount: 0 })` | Autocomplete — NSE/BSE filtered |
| `/api/symbols` | GET | Static — returns `POPULAR_STOCKS` | Symbol list for dashboard seed |
| `/api/screener` | GET | `yf.quote()` + `yf.quoteSummary(financialData, defaultKeyStatistics, incomeStatementHistory, earningsHistory, majorHoldersBreakdown, assetProfile)` | 4-point screener |
| `/api/top-screener` | GET | `screenOne()` × pool size | Bulk screener for rankings |

### Symbol Normalisation

All routes apply the same normalisation:
```ts
// No suffix → assume NSE
if (!ticker.endsWith('.NS') && !ticker.endsWith('.BO')) {
  ticker = `${ticker}.NS`;
}
// .BO → BSE, everything else → NSE
const exchange = ticker.endsWith('.BO') ? 'BSE' : 'NSE';
```

### Error Handling

Every API route wraps its logic in `try/catch`. On Yahoo Finance error (symbol not found, network timeout), a structured error response is returned:
```json
{ "status": "error", "message": "No data found for XYZ.NS. Check the symbol and try again." }
```
The frontend renders this as an error banner rather than crashing.

---

## 8. Data Flow

### Single Stock Screener Request

```
User types "RELIANCE" → clicks Analyse
  │
  ├─ Browser: fetch /api/screener?symbol=RELIANCE
  │
  ├─ API Route (server):
  │    ticker = "RELIANCE.NS"
  │    ├─ yf.quote("RELIANCE.NS")           → regularMarketPrice, 52W High/Low, change%
  │    └─ yf.quoteSummary("RELIANCE.NS", {
  │         modules: [financialData, defaultKeyStatistics,
  │                   incomeStatementHistory, earningsHistory,
  │                   majorHoldersBreakdown, assetProfile]
  │       })
  │       → netIncome[0..3] for CAGR
  │       → operatingMargins for OPM
  │       → insidersPercentHeld for promoter check
  │       → earningsHistory.history[].epsActual for EPS trend
  │
  ├─ Compute 4 checks, passCount, dropFromHigh
  ├─ Return ScreenerResult JSON
  │
  └─ Browser: render score ring + 4 check cards + verdict
```

### Portfolio CSV Analysis Flow

```
User drops file.csv
  │
  ├─ FileReader.readAsText()
  ├─ parseCSV() → extract headers → match columns → cleanSymbol()
  ├─ deduplicate → PortfolioResult[] (all status: 'pending')
  │
  └─ for i = 0; i < rows.length; i += 3:
       setResults(rows with status 'loading' for batch i..i+2)
       await Promise.all([
         fetch /api/screener?symbol=row[i]
         fetch /api/screener?symbol=row[i+1]
         fetch /api/screener?symbol=row[i+2]
       ])
       → update rows with screener result + recommendation + pnlPct
       setResults(updated rows)
       await sleep(700ms)
```

---

## 9. Screener Logic — Technical Breakdown

### Check 1: 3-Year Profit Growth > 15%

**Data:** `incomeStatementHistory.incomeStatementHistory[]` — array of annual income statements (up to 4 years, most recent first).

**Algorithm:**
```
netIncomes = stmts.map(y => y.netIncome).filter(v > 0).reverse()
// oldest first: [2021, 2022, 2023, 2024]

years = netIncomes.length - 1
CAGR = (netIncomes[last] / netIncomes[0])^(1/years) - 1

pass = CAGR >= 15%
```

**Fallback:** If fewer than 2 data points (Yahoo Finance has reduced historical data since late 2024), falls back to `financialData.earningsGrowth` (Yahoo's own YoY estimate).

**Why 15%?** At 15% CAGR, a company doubles its profits in ~5 years. This is the minimum growth rate that justifies equity investment vs safer instruments.

---

### Check 2: OPM is Stable

**Data:** `financialData.operatingMargins` (current operating profit margin, expressed as a decimal e.g. `0.261` = 26.1%).

**Algorithm:**
```
currentOPM = financialData.operatingMargins

// Stability proxy: coefficient of variation of YoY net income growth rates
if netIncomes.length >= 3:
  growthRates = [((ni[1]-ni[0])/ni[0])*100, ...]
  mean = average(growthRates)
  stdDev = sqrt(variance(growthRates))
  coeffVar = stdDev / |mean| * 100

  stable = coeffVar < 20  // <20% variation is "stable"
else:
  stable = true  // insufficient data → assume stable

pass = stable AND currentOPM > 5%
```

**Why OPM stability matters:** A company might have high absolute OPM now but if it's been declining quarter-over-quarter, the business model is under pressure. Stable OPM = consistent pricing power + cost control.

---

### Check 3: Promoter Stake ≥ 30%

**Data:** `majorHoldersBreakdown.insidersPercentHeld` — the percentage of shares held by insiders/promoters.

**Algorithm:**
```
pass = insidersPercentHeld >= 0.30  // i.e. ≥ 30%
```

**Limitation:** Yahoo Finance provides only the *current* value, not a historical trend. So this check answers "are promoters significantly present?" rather than "are promoters increasing their stake?". The detail string explicitly notes this limitation and directs users to verify quarterly shareholding patterns on BSE India.

**Why 30%?** SEBI's open offer threshold is 25%. A promoter holding above 30% generally indicates a high-conviction founder/owner; below that, it suggests the promoter has distributed most of their stake.

---

### Check 4: EPS is Increasing

**Data:** `earningsHistory.history[]` — array of quarterly EPS actual values (most recent last).

**Algorithm:**
```
epsQuarters = history.map(q => q.epsActual).filter(defined)

// Check monotonic/near-monotonic uptrend
increases = count(epsQuarters[i] > epsQuarters[i-1])
pass = increases >= length - 1  // all or all-but-one must increase
```

**Fallback:** If fewer than 3 quarters of history:
```
pass = forwardEps > trailingEps
// i.e. analysts expect higher earnings next year than the last 12 months
```

**Why EPS trend?** Revenue and profit can be manipulated through accounting. EPS cuts through to what shareholders actually earn per share. A consistent uptrend in EPS — even modest — signals management is executing and dilution is controlled.

---

### Score Interpretation

```
passCount / totalChecks  →  Score %  →  Verdict
─────────────────────────────────────────────────
4/4 or 3/4              →  ≥ 75%    →  Strong Buy Candidate
2/4 (or 2/3 if 1 N/A)   →  ≥ 50%    →  Moderate — Verify More
0/4 or 1/4              →  < 50%    →  Risky — Avoid

Combined with dip zone:
  score ≥ 75%  AND  dropFromHigh ≤ -30%  →  "Strong Buy Candidate — All signals align"
  score < 50%  OR   not in dip zone      →  "Not in Zone / Fails Key Checks"
  50–74%                                 →  "Partial Match — Proceed with Caution"
```

---

## 10. UI/UX Design System

### Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0a0e1a` | Page background |
| `bg-surface` | `#111827` | Cards, panels |
| `bg-elevated` | `#1f2937` | Hover states, table headers, borders |
| `accent-orange` | `#f97316` | Primary accent, Analyse button, active nav |
| `accent-red` | `#ef4444` | Screener nav, sell signals, fail states |
| `accent-purple` | `#6366f1` | Portfolio nav, rankings bars |
| `green` | `#22c55e` | Pass states, gainers, strong buy |
| `yellow` | `#facc15` | Hold states, partial match, moderate caution |
| `text-primary` | `#f9fafb` | Headings, values |
| `text-secondary` | `#9ca3af` | Subtitles, labels |
| `text-muted` | `#6b7280` | Captions, helper text |

### Component Patterns

**Rounded cards:** All cards use `rounded-2xl border` with `bg-surface` and `border-elevated`. Interactive cards get `transition-colors` + mouse enter/leave handlers for hover states (inline style to avoid Tailwind purge issues).

**Gradient buttons:** Primary CTAs use `background: linear-gradient(135deg, #ef4444, #f97316)`. This is the "fire" gradient consistent with the app branding.

**Loading states:**
- Inline spinners: `<RefreshCw className="animate-spin" />`
- Skeleton screens: `<div className="shimmer h-N w-N" />` — defined in `globals.css` as a `@keyframes` shimmer animation

**Autocomplete dropdown:** `position: absolute`, `top: 100%`, `z-index: 50`. Uses `onMouseDown` with `e.preventDefault()` (not `onClick`) to prevent the input losing focus before the selection is registered.

### Responsive Strategy

| Breakpoint | Layout changes |
|---|---|
| `< sm` | Navbar hides SearchBar; shows below nav. Table hides some columns. |
| `sm–md` | Full SearchBar visible. Grid = 2 columns. |
| `lg+` | Full grid (3–4 columns). Rankings expanded rows show 4-column grid. |

---

## 11. Deployment Architecture

### Vercel Serverless Functions

Each file in `app/api/*/route.ts` becomes a separate serverless function on Vercel. Key configuration:

```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 30 }
  },
  "installCommand": "npm install --legacy-peer-deps"
}
```

**Why 30 seconds?** The `/api/top-screener` route screens up to 40 stocks in batches of 5. Each batch makes 2 Yahoo Finance HTTP calls per stock (quote + quoteSummary). In the worst case (cold start + slow Yahoo response), this approaches 25–28 seconds. The 10-second default would time out.

### `serverExternalPackages`

```js
// next.config.js
serverExternalPackages: ['yahoo-finance2']
```

`yahoo-finance2` uses dynamic `require()` calls internally to load modules conditionally. Webpack/Turbopack's static analysis cannot resolve these and fails the bundle. Marking it as an external tells Next.js to `require()` it at runtime from `node_modules` instead — standard Node.js module resolution, no bundling.

### Build Output

```
Route (app)
├ ○ /                    Static — prerendered (no server props)
├ ○ /portfolio           Static
├ ○ /screener            Static
├ ○ /top-screener        Static
├ ○ /watchlist           Static
├ ƒ /api/screener        Serverless function
├ ƒ /api/search          Serverless function
├ ƒ /api/stock           Serverless function
├ ƒ /api/stock/list      Serverless function
├ ƒ /api/symbols         Serverless function
├ ƒ /api/top-screener    Serverless function
└ ƒ /stock/[symbol]      Serverless function (dynamic segment)
```

Pages are static shells — they render instantly from CDN. All data fetching happens client-side by calling the serverless API routes. This gives best-of-both-worlds: fast page load + live data.

---

## 12. Challenges & Solutions

### Challenge 1: Upstream API Shutdown

The original data source (`0xramm/Indian-Stock-Market-API` on Koyeb) returned 404 on all endpoints mid-development. The service had been terminated.

**Solution:** Pivoted to `yahoo-finance2` npm package. This was actually a better outcome — no dependency on an external service's uptime, no API key to manage, richer data (quoteSummary has 20+ modules).

### Challenge 2: yahoo-finance2 v3 Breaking Change

`yahoo-finance2` v3 introduced a mandatory instantiation change. The old pattern:
```ts
import yahooFinance from 'yahoo-finance2';
yahooFinance.quote('RELIANCE.NS');  // throws: "Call new YahooFinance() first"
```

**Solution:** Created `lib/yf.ts` singleton using `new YahooFinance()`.

### Challenge 3: Tailwind Dynamic Class Purging

Computed Tailwind class names like `` `text-${color}-500` `` are stripped in production builds because the JIT compiler can't statically analyse them.

**Solution:** All dynamic colours use inline `style` props — zero risk of purging.

### Challenge 4: Folder Name with Capital Letters

`create-next-app` refused to scaffold into `New-Stock-App` because npm package names must be lowercase.

**Solution:** Manually created all config files (`package.json`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `next.config.js`) and scaffolded the project structure by hand.

### Challenge 5: Nested Git Repository

The workspace root (`Desktop/`) was already a git repository. Staging files from `New-Stock-App/` using `git add` from the parent repository caused `node_modules` and `.next/` to be included, and the nested subproject was treated as a git submodule.

**Solution:** Ran `git init` inside `New-Stock-App/` itself to create an independent repository with its own `.gitignore`, then pushed directly to the target GitHub remote.

### Challenge 6: SearchBar Duplicate Key Warning

Yahoo Finance's search endpoint sometimes returns the same symbol multiple times (e.g. `BAJAJINDEF` appearing twice with different metadata). React's `key` prop must be unique per sibling, causing warnings.

**Solution:**
1. Deduplicate results using a `Set<string>` before `setResults()`
2. Use composite key `${symbol}-${index}` as fallback

### Challenge 7: Screener Data Sparsity

Since late 2024, Yahoo Finance has reduced the volume of `incomeStatementHistory` data returned — many stocks now return only 1–2 years instead of 4. This broke the CAGR calculation.

**Solution:** Added `earningsGrowth` fallback from `financialData` module when fewer than 2 income statement data points are available. Similarly, EPS check falls back to trailing vs. forward EPS comparison when quarterly history is sparse.

---

## 13. Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| Yahoo Finance data delay (15–20 min for NSE/BSE) | Prices are not truly real-time | Clearly labelled; suitable for fundamental analysis (not HFT) |
| `insidersPercentHeld` reflects current state, not trend | Promoter check cannot detect stake *reduction* | Detail string advises manual BSE/NSE shareholding pattern verification |
| `incomeStatementHistory` sparse post-2024 | CAGR check falls back to YoY estimate | Two-tier fallback logic mitigates this |
| Top-screener pool is curated, not exhaustive | May miss emerging stocks not in the pool | Pool can be extended in `lib/capStocks.ts` |
| No historical price charts | Cannot visualise price trend | Would require a charting library + historical data API |
| Portfolio CSV date columns ignored | Cannot calculate holding period returns | Planned for future roadmap |

---

## 14. Future Roadmap

### Short-term
- [ ] Price chart on stock detail page (TradingView lightweight-charts or Recharts with historical data)
- [ ] Add 52-week high/low date labels on range bars
- [ ] Dark/light mode toggle
- [ ] PWA support — add to home screen on mobile

### Medium-term
- [ ] Historical promoter stake trend via quarterly report scraping (BSE XML filings)
- [ ] Sector-wise grouping on dashboard
- [ ] Alert system — email/push notification when a watchlisted stock enters the dip zone
- [ ] Holding period return in portfolio analyser (when CSV includes buy date)

### Long-term
- [ ] User accounts (NextAuth) + server-side watchlist/portfolio persistence
- [ ] Backtesting: how often did stocks that passed all 4 checks recover after a 30%+ dip?
- [ ] Mutual fund overlap checker — input two folios, show common holdings
- [ ] Screener API — public REST API for developers

---

*Built with ❤️ for the Indian retail investor. Not financial advice.*
