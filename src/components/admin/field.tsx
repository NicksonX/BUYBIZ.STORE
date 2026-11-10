import type * as React from "react";
import { cn } from "@/lib/utils";

export function AdminField({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[10.5px] font-medium text-foreground">
          {label}
        </label>
        {hint ? <span className="text-[9px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-[9.5px] text-danger">{error}</p> : null}
    </div>
  );
}

export function AdminNote({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-border bg-surface-subtle text-muted-foreground",
    warning: "border-warning/20 bg-warning-soft text-warning",
    danger: "border-danger/20 bg-danger-soft text-danger",
    info: "border-info/20 bg-info-soft text-info",
  };
  return (
    <div className={cn("rounded-[9px] border px-3 py-2 text-[9.5px] leading-4", tones[tone])}>
      {children}
    </div>
  );
}
