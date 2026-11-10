import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border-strong bg-surface-subtle/50 px-6 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface text-muted-foreground shadow-xs">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[12.5px] leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
