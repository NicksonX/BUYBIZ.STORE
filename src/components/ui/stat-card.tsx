import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
  valueClassName,
  action,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "surface-card group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[14px] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "tabular mt-2.5 truncate text-[22px] font-semibold leading-none tracking-[-0.035em] sm:text-[25px]",
              valueClassName,
            )}
          >
            {value}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface-subtle text-foreground shadow-xs">
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3.5 flex min-h-5 items-center justify-between gap-2">
        {hint ? (
          <div className="truncate text-[10.5px] leading-4 text-muted-foreground">{hint}</div>
        ) : (
          <span />
        )}
        {action}
      </div>
    </div>
  );
}
