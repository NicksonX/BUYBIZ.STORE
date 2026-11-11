import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 px-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:text-[11.5px]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[25px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <div className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground sm:text-[13px]">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
