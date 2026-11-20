import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { PlanAvailability, Product } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatDuration, formatNaira } from "@/lib/utils";

export function PlanCard({
  product,
  availability,
  href,
  featured = false,
  ctaLabel = "Buy with wallet",
  className,
  showFeatures = true,
  paused = false,
}: {
  product: Product;
  availability?: Pick<PlanAvailability, "available" | "freeSeats"> | null;
  href?: string;
  featured?: boolean;
  ctaLabel?: string;
  className?: string;
  showFeatures?: boolean;
  paused?: boolean;
}) {
  const available = availability ? availability.available : true;
  const duration = formatDuration(product.durationSeconds);
  const features = product.features.length
    ? product.features
    : [
        "Instant allocation when stock is available",
        product.slug === "proxy-7-days"
          ? "Shared proxy access"
          : "Shared upstream proxy",
        "Expiry shown clearly in your dashboard",
      ];
  const target = href ?? `/dashboard/checkout/${product.slug}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[16px] border p-4 transition-all duration-300 sm:rounded-[18px] sm:p-5",
        featured
          ? "border-[#26282c] bg-[#0A0B0D] text-white shadow-[0_30px_70px_-38px_rgba(0,0,0,0.75)]"
          : "border-border bg-surface text-foreground shadow-xs hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className,
      )}
    >
      <div className="relative flex items-center justify-end">
        <Badge
          tone={featured ? "onDark" : available ? "success" : "warning"}
          className={featured ? "border-white/15 bg-white/[0.06] text-white/80" : ""}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              available ? "bg-current" : "bg-current opacity-70",
            )}
          />
          {paused ? "Maintenance" : available ? "Available now" : "Unavailable"}
        </Badge>
      </div>

      <div className="relative mt-3">
        <h3
          className={cn(
            "text-[18px] font-semibold tracking-[-0.03em]",
            featured ? "text-white" : "text-foreground",
          )}
        >
          {product.name}
        </h3>
        <p
          className={cn(
            "mt-1.5 line-clamp-3 text-[12.5px] leading-5 sm:line-clamp-none sm:min-h-[40px] sm:text-[12px]",
            featured ? "text-white/65" : "text-muted-foreground",
          )}
        >
          {product.description}
        </p>
      </div>

      <div className="relative mt-4 flex items-end gap-2 sm:mt-5">
        <span className="tabular text-[30px] font-semibold leading-none tracking-[-0.05em] sm:text-[32px]">
          {formatNaira(product.priceMinor)}
        </span>
        <span
          className={cn(
            "pb-0.5 text-[11px]",
            featured ? "text-white/55" : "text-muted-foreground",
          )}
        >
          / {duration}
        </span>
      </div>

      {showFeatures ? (
        <ul className="relative mt-4 space-y-2 border-t border-current/10 pt-4 sm:mt-5 sm:space-y-2.5 sm:pt-5">
          {features.map((feature) => (
            <li
              key={feature}
              className={cn(
                "flex items-start gap-2 text-[12.5px] leading-5 sm:text-[11.5px]",
                featured ? "text-white/70" : "text-muted-foreground",
              )}
            >
              <Check
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  featured ? "text-white/70" : "text-foreground",
                )}
                strokeWidth={2}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative mt-auto pt-5 sm:pt-6">
        {paused ? (
          <div
            className={cn(
              "flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full px-3 text-center text-[11px] font-semibold opacity-80",
              featured ? "bg-white/10 text-white" : "bg-surface-subtle text-muted-foreground",
            )}
            aria-disabled="true"
          >
            Purchases Temporarily Paused
          </div>
        ) : available ? (
          <Link
            href={target}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-semibold transition-colors sm:h-10 sm:text-[12.5px]",
              featured
                ? "bg-white text-[#0A0B0D] hover:bg-white/90"
                : "bg-[#0A0B0D] text-white hover:bg-[#1a1c1f]",
            )}
          >
            {ctaLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div
            className={cn(
              "flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full text-[13px] font-semibold opacity-55 sm:h-10 sm:text-[12.5px]",
              featured ? "bg-white/10 text-white" : "bg-surface-subtle text-foreground",
            )}
            aria-disabled="true"
          >
            No matching stock for this duration
          </div>
        )}
      </div>
    </article>
  );
}
