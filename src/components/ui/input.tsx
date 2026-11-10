import type * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      suppressHydrationWarning
      className={cn(
        "flex h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-[13.5px] text-foreground shadow-xs outline-none transition-colors placeholder:text-muted/90 hover:border-border-strong focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      suppressHydrationWarning
      className={cn(
        "flex min-h-28 w-full resize-y rounded-[10px] border border-border bg-surface px-3.5 py-3 text-[13.5px] leading-6 text-foreground shadow-xs outline-none transition-colors placeholder:text-muted/90 hover:border-border-strong focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      suppressHydrationWarning
      className={cn(
        "h-11 w-full appearance-none rounded-[10px] border border-border bg-surface bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20stroke%3D%22%23686c74%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.7%22%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9 text-[13.5px] text-foreground shadow-xs outline-none transition-colors hover:border-border-strong focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-[12.5px] font-medium leading-5 text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-[11.5px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
