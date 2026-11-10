import Link from "next/link";
import { ArrowUpRight, Network } from "lucide-react";
import type { PlanAvailability } from "@/lib/db/types";
import { formatDuration, formatNaira } from "@/lib/utils";

export function PlanStrip({ plans }: { plans: PlanAvailability[] }) {
  if (plans.length === 0) return null;
  return (
    <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
      {plans.map((plan) => (
        <div
          key={plan.product.id}
          className="surface-card flex min-w-[74%] shrink-0 snap-center items-center justify-between gap-3 rounded-[12px] p-3.5 sm:min-w-0"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
              <Network className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium">
                {formatDuration(plan.product.durationSeconds)}
              </p>
              <p className="tabular mt-0.5 text-[10px] text-muted-foreground">
                {formatNaira(plan.product.priceMinor)}
                {plan.available ? (
                  <span className="ml-1.5 text-success">· available</span>
                ) : (
                  <span className="ml-1.5 text-warning">· unavailable</span>
                )}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/checkout/${plan.product.slug}`}
            aria-label={`Buy ${plan.product.name}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}
