"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CandlestickChart,
  ChevronDown,
  LineChart,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const navigationItems = [
  { label: "Dashboard", href: "/#market-dashboard", hasDropdown: false },
  { label: "Screener", href: "/screener", hasDropdown: true },
  { label: "Watchlist", href: "/watchlist", hasDropdown: false },
  { label: "Portfolio", href: "/portfolio", hasDropdown: false },
  { label: "Rankings", href: "/top-screener", hasDropdown: true },
];

const heroHighlights = [
  "Live NSE and BSE market snapshots",
  "4-point dip analysis for faster screening",
  "Portfolio and watchlist tools without signup",
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
};

const Hero2 = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_28%)]" />
      <div className="absolute -right-48 top-0 z-0 flex flex-col items-end blur-3xl">
        <div className="h-40 w-[52rem] rounded-full bg-gradient-to-b from-orange-500 to-sky-500 opacity-70" />
        <div className="h-40 w-[70rem] rounded-full bg-gradient-to-b from-emerald-500 to-yellow-400 opacity-50" />
        <div className="h-40 w-[54rem] rounded-full bg-gradient-to-b from-rose-500 to-amber-300 opacity-60" />
      </div>
      <div className="absolute inset-0 z-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.5)_0.8px,transparent_0.8px)] [background-size:16px_16px]" />

      <div className="relative z-10">
        <nav className="container mx-auto mt-6 flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
              <CandlestickChart className="h-5 w-5" />
            </div>
            <span className="ml-3 text-xl font-bold text-white">
              Stock<span className="text-orange-400">IN</span>
            </span>
          </Link>

          <div className="hidden items-center space-x-6 md:flex">
            <div className="flex items-center space-x-6">
              {navigationItems.map((item) => (
                <NavItem
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  hasDropdown={item.hasDropdown}
                />
              ))}
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/watchlist"
                className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Open Watchlist
              </Link>
            </div>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 md:hidden"
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                    <CandlestickChart className="h-5 w-5" />
                  </div>
                  <span className="ml-3 text-xl font-bold text-white">
                    Stock<span className="text-orange-400">IN</span>
                  </span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="mt-8 flex flex-col space-y-6">
                {navigationItems.map((item) => (
                  <MobileNavItem
                    key={item.label}
                    href={item.href}
                    label={item.label}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
                <Link
                  href="/watchlist"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-gray-700 text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Open Watchlist
                </Link>
                <Link
                  href="/screener"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Analyze a Stock
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto mt-6 flex max-w-fit items-center justify-center space-x-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">
            Built for fast Indian stock research
          </span>
          <ArrowRight className="h-4 w-4 text-white" />
        </motion.div>

        <div className="container mx-auto mt-12 px-4 pb-24 text-center">
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.65, delay: 0.08, ease: "easeOut" }}
            className="mx-auto max-w-5xl text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl"
          >
            Find stronger Indian stocks before the rebound becomes obvious
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.65, delay: 0.16, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-3xl text-lg text-gray-300"
          >
            Live NSE and BSE pricing, dip analysis, portfolio checks, and
            cap-wise rankings in one workflow built for retail investors.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.65, delay: 0.24, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/screener"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-black transition hover:bg-white/90"
            >
              Open Dip Screener
            </Link>
            <Link
              href="/top-screener"
              className="inline-flex h-12 items-center justify-center rounded-full border border-gray-600 px-8 text-base font-medium text-white transition hover:bg-white/10"
            >
              View Top Rankings
            </Link>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.65, delay: 0.32, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-300"
          >
            {heroHighlights.map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.4 }}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
              >
                {item}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.36, ease: "easeOut" }}
            className="relative mx-auto my-20 w-full max-w-6xl"
          >
            <div className="absolute inset-0 rounded-3xl bg-white opacity-15 blur-[8rem]" />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-sm text-gray-300">
                <div className="flex items-center gap-3">
                  <LineChart className="h-4 w-4 text-orange-400" />
                  <span>Market momentum overview</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">
                  Live workflow
                </span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80"
                alt="Stock market dashboard on multiple screens"
                className="h-auto w-full object-cover"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

function NavItem({
  href,
  label,
  hasDropdown,
}: {
  href: string;
  label: string;
  hasDropdown?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center text-sm text-gray-300 transition hover:text-white"
    >
      <span>{label}</span>
      {hasDropdown && <ChevronDown className="ml-1 h-4 w-4" />}
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between border-b border-gray-800 pb-2 text-lg text-white"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-gray-400" />
    </Link>
  );
}

export { Hero2 };
