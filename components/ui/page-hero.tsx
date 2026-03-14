"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";

type HeroAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

interface PageHeroProps {
  badge?: string;
  icon?: ReactNode;
  title: string;
  accent?: string;
  description: string;
  meta?: string;
  actions?: HeroAction[];
}

export default function PageHero({
  badge,
  icon,
  title,
  accent,
  description,
  meta,
  actions = [],
}: PageHeroProps) {
  return (
    <section className="theme-page-hero theme-panel-strong mb-8 px-6 py-8 md:px-10 md:py-10">
      <div className="relative z-10 max-w-4xl">
        {badge && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
            {icon && <span className="text-orange-300">{icon}</span>}
            <span>{badge}</span>
          </div>
        )}

        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">
          {title}
          {accent && <span className="text-orange-400"> {accent}</span>}
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
          {description}
        </p>

        {meta && (
          <p className="mt-4 text-sm text-slate-400">
            {meta}
          </p>
        )}

        {actions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action) => {
              const content = (
                <>
                  <span>{action.label}</span>
                  {action.icon ?? (action.variant !== "secondary" ? <ArrowRight className="h-4 w-4" /> : null)}
                </>
              );

              const className =
                action.variant === "secondary"
                  ? "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  : "inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90";

              if (action.href) {
                return (
                  <Link key={action.label} href={action.href} className={className}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={className}
                  style={{ opacity: action.disabled ? 0.5 : 1 }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
