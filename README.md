# 📈 StockIN — Indian Stock Market Screener & Analyser

A full-featured, real-time Indian stock market web application built with **Next.js 16**, **React 19**, and **TypeScript**. Live data is sourced directly via `yahoo-finance2` — no paid API keys required.

**Live Demo →** *(deploy to Vercel and paste your URL here)*  
**GitHub →** https://github.com/Babajan-B/Stock-Screener-India

---

## ✨ Features

| Module | Description |
|---|---|
| **Dashboard** | Live NSE/BSE prices for 20 popular large-caps, grid/table toggle, gainers/losers filter, sortable columns, auto-refresh every 60 s |
| **Stock Detail** | Full fundamentals (P/E, EPS, Book Value, Dividend Yield, Market Cap), NSE ↔ BSE tab switcher, day's range bar, 52-week range bar |
| **Watchlist** | Personalised list stored in `localStorage`; add by symbol, remove on hover, live price cards |
| **Stock Dip Analyser** | 4-point checklist for stocks down 30–40 % — company-name autocomplete search, score ring, expand-for-detail cards, buy/hold/sell verdict banner |
| **Portfolio Analyser** | Upload your broker's CSV → auto-detects symbol, qty & buy-price columns → runs screener on every holding → Buy / Hold / Sell signals, P&L %, sortable table, export to CSV |
| **Top Rankings** | Best-scoring stocks ranked by screener score + 52-week-high drop, split into **Large Cap / Mid Cap / Small Cap / Micro Cap** tabs, expandable rows, 5-min client cache, refresh control |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | React 19, Tailwind CSS 3.4, Lucide React icons |
| Data | `yahoo-finance2` v3 (server-side, no API key needed) |
| Persistence | `localStorage` (watchlist) |
| Deployment | Vercel (serverless functions, `maxDuration: 30s`) |

---

## 📁 Project Structure

```
New-Stock-App/
├── app/
│   ├── page.tsx                   # Dashboard
│   ├── layout.tsx                 # Root layout
│   ├── globals.css                # Tailwind + global styles
│   ├── stock/[symbol]/page.tsx    # Stock detail page
│   ├── watchlist/page.tsx         # Watchlist
│   ├── screener/page.tsx          # 4-point Dip Analyser
│   ├── portfolio/page.tsx         # Portfolio CSV analyser
│   ├── top-screener/page.tsx      # Rankings by market cap
│   └── api/
│       ├── stock/route.ts         # Single stock quote + summary
│       ├── stock/list/route.ts    # Batch stock quotes
│       ├── search/route.ts        # Autocomplete search (NSE/BSE filtered)
│       ├── symbols/route.ts       # Symbol list
│       ├── screener/route.ts      # 4-check fundamental screener
│       └── top-screener/route.ts  # Bulk screener by market-cap pool
├── components/
│   ├── Navbar.tsx                 # Sticky nav with search bar
│   ├── SearchBar.tsx              # Global search with autocomplete
│   ├── StockCard.tsx              # Watchlist card
│   ├── StockTable.tsx             # Dashboard table
│   └── StatCard.tsx               # Summary stat tile
├── lib/
│   ├── yf.ts                      # yahoo-finance2 singleton
│   ├── types.ts                   # Shared TS interfaces + helpers
│   └── capStocks.ts               # Curated NSE symbol pools per cap tier
├── .gitignore
├── vercel.json                    # Vercel deployment config
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 📊 Screener — 4-Point Checklist

When a stock falls **30–40 %** from its 52-week high, the screener evaluates:

| # | Check | Pass Condition | Data Source |
|---|---|---|---|
| 1 | **3-Year Profit Growth > 15 %** | Net income 3Y CAGR ≥ 15 %, fallback to `earningsGrowth` | `incomeStatementHistory` |
| 2 | **OPM is Stable** | `operatingMargins > 5 %` and profit growth variance < 20 % | `financialData` |
| 3 | **Promoter Stake ≥ 30 %** | `insidersPercentHeld ≥ 0.30` | `majorHoldersBreakdown` |
| 4 | **EPS Increasing** | Quarterly EPS trend upward, fallback trailing vs forward EPS | `earningsHistory` / `defaultKeyStatistics` |

**Signal logic:**

| Score | In Dip Zone (30–50 % off high) | Signal |
|---|---|---|
| 3–4 / 4 | ✅ Yes | **Strong Buy** |
| 2+ / 4 | ✅ Yes | **Buy** |
| 2+ / 4 | ❌ No | **Hold** |
| 0–1 / 4 | Any | **Sell / Avoid** |

---

## 💼 Portfolio CSV Format

The uploader auto-detects columns — works with all major Indian broker exports:

| Broker | Symbol column | Qty column | Avg buy price column |
|---|---|---|---|
| **Zerodha / Kite** | `Instrument` | `Qty` | `Avg cost` |
| **Groww** | `Symbol` | `Quantity` | `Average Buy Price` |
| **Upstox** | `Symbol` | `Quantity` | `Buy Price` |
| **Angel One** | `Symbol` | `Qty` | `Avg. Buy Price` |
| **Custom** | Any of: `symbol`, `stock`, `scrip`, `ticker` | Any of: `qty`, `shares`, `units` | Any of: `buyprice`, `avgcost`, `costprice` |

Suffixes like `RELIANCE-EQ`, `RELIANCE:NSE`, `RELIANCE.NS` are all normalised automatically.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
git clone https://github.com/Babajan-B/Stock-Screener-India.git
cd Stock-Screener-India
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Why `--legacy-peer-deps`?**  
> `yahoo-finance2` v3 has a peer dependency on Node types that conflicts with Next.js's bundled types. The flag bypasses the conflict without affecting runtime behaviour.

### Available Scripts

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build + type-check
npm run start    # Start production server
npm run lint     # ESLint
```

---

## ☁️ Deploying to Vercel

### Option A — GUI (recommended)

1. Push your code to GitHub (already done ✅)
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import `Babajan-B/Stock-Screener-India`
4. Framework preset: **Next.js** (auto-detected)
5. No environment variables needed
6. Click **Deploy** — Vercel reads `vercel.json` automatically

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

### vercel.json explained

```json
{
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps",
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 30 }
  }
}
```

- `installCommand` — ensures `yahoo-finance2` installs without peer-dep errors on Vercel's CI
- `maxDuration: 30` — the screener and top-screener routes fetch multiple Yahoo Finance endpoints; 30 s prevents cold-start timeouts

### next.config.js — `serverExternalPackages`

```js
serverExternalPackages: ['yahoo-finance2']
```

Tells Next.js to treat `yahoo-finance2` as a Node.js external (not bundled by Webpack/Turbopack), which is required because the package uses dynamic `require()` calls internally.

---

## 🔌 API Routes Reference

All routes are server-side Next.js route handlers (`app/api/`).

### `GET /api/stock?symbol=RELIANCE`
Returns full quote + summary for a single stock.

**Query params:** `symbol` — NSE symbol (no suffix needed; `.NS` appended automatically). Append `.BO` for BSE.

**Response:**
```json
{
  "status": "success",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "data": {
    "company_name": "Reliance Industries Limited",
    "last_price": 1370.5,
    "change": -12.3,
    "percent_change": -0.89,
    "week52High": 1608.95,
    "week52Low": 1156.0,
    "pe_ratio": 24.1,
    "eps": 56.8,
    "market_cap": 1854000000000,
    "sector": "Energy"
  }
}
```

---

### `GET /api/stock/list?symbols=RELIANCE,TCS,INFY`
Batch quote fetch (comma-separated symbols). Returns array of `StockListItem`.

---

### `GET /api/search?q=tata`
Autocomplete search — returns NSE/BSE-filtered results only.

**Response:**
```json
{
  "results": [
    { "symbol": "TATAMOTORS", "company_name": "Tata Motors Limited" },
    { "symbol": "TCS",        "company_name": "Tata Consultancy Services" }
  ]
}
```

---

### `GET /api/screener?symbol=TCS`
Runs the 4-point screener on a single stock.

**Response:**
```json
{
  "status": "success",
  "symbol": "TCS",
  "last_price": 3120.0,
  "dropFromHigh": -28.5,
  "passCount": 3,
  "totalChecks": 4,
  "checks": {
    "profitGrowth3Y": { "pass": true,  "value": "18.2% CAGR", "detail": "..." },
    "opmStable":      { "pass": true,  "value": "26.1%",       "detail": "..." },
    "promoterStakeStable": { "pass": false, "value": "11.42%", "detail": "..." },
    "epsIncreasing":  { "pass": true,  "value": "₹118.40 TTM", "detail": "..." }
  }
}
```

---

### `GET /api/top-screener?cap=large|mid|small|micro`
Screens a curated pool of stocks for the given cap tier, returns top 20 sorted by score then 52W-high drop.

---

## 🧠 How Rankings Work

Each cap tier has a curated pool of well-known NSE symbols:

| Tier | Pool size | Examples |
|---|---|---|
| Large Cap | 40 | RELIANCE, TCS, HDFCBANK, ICICIBANK, BHARTIARTL … |
| Mid Cap | 30 | PERSISTENT, COFORGE, DIXON, CAMS, ANGELONE … |
| Small Cap | 30 | SAFARI, LATENTVIEW, IRCTC, AAVAS, CREDITACC … |
| Micro Cap | 25 | KAYNES, SYRMA, AVALON, RVNL, STLTECH … |

Ranked by: **screener passCount ↓**, then **|dropFromHigh| ↓** (bigger dip with good fundamentals = ranked higher).

---

## 🎨 Design System

- **Background:** `#0a0e1a` (deep navy)
- **Surface:** `#111827` (card backgrounds)
- **Border:** `#1f2937`
- **Accent:** `#f97316` (orange) / `#ef4444` (red)
- **Green:** `#22c55e` · **Yellow:** `#facc15` · **Red:** `#ef4444`
- Font: System default (Inter/SF Pro stack via Tailwind)
- All colours applied via inline `style` props for reliable Tailwind purge compatibility

---

## ⚠️ Disclaimer

This application is for **informational and educational purposes only**. It is **not** financial advice. Always do your own research and consult a SEBI-registered investment advisor before making investment decisions.

Data is sourced from Yahoo Finance and may be delayed or inaccurate. The screener scores are algorithmic indicators, not guarantees of future performance.

---

## 📄 License

MIT © 2026 Babajan-B
