import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MarketingPageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  compact = false,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[#08090B] text-white",
        compact ? "pb-12 pt-10 sm:pb-16 sm:pt-14" : "pb-16 pt-12 sm:pb-20 sm:pt-16",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-25" />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[460px] w-[460px] rounded-full bg-white/[0.055] blur-[110px]" />
      <div className="noise" />
      <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div
          className={cn(
            "flex flex-col gap-8",
            aside ? "lg:flex-row lg:items-end lg:justify-between" : "",
          )}
        >
          <div className="max-w-[680px]">
            <p className="text-[11px] font-medium text-white/50">
              {eyebrow}
            </p>
            <h1
              className={cn(
                "mt-4 font-semibold leading-[1.02] tracking-[-0.05em]",
                compact
                  ? "text-[34px] sm:text-[44px]"
                  : "text-[38px] sm:text-[52px]",
              )}
            >
              {title}
            </h1>
            {description ? (
              <div className="mt-4 max-w-[560px] text-[13px] leading-6 text-white/45 sm:text-[13.5px]">
                {description}
              </div>
            ) : null}
            {actions ? (
              <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
                {actions}
              </div>
            ) : null}
          </div>
          {aside ? <div className="hidden shrink-0 lg:block">{aside}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function HeroLink({
  href,
  children,
  secondary,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-[11.5px] font-medium transition-colors",
        secondary
          ? "border border-white/15 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
          : "bg-white text-[#0A0B0D] hover:bg-white/90",
      )}
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}
