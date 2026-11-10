import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 tracking-[0.01em]",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-subtle text-muted-foreground",
        solid: "border-transparent bg-primary text-primary-foreground",
        dark: "border-[#2a2d32] bg-[#111316] text-white",
        success: "border-success/20 bg-success-soft text-success",
        warning: "border-warning/20 bg-warning-soft text-warning",
        danger: "border-danger/20 bg-danger-soft text-danger",
        info: "border-info/20 bg-info-soft text-info",
        outline: "border-border bg-transparent text-foreground",
        onDark: "border-white/15 bg-white/[0.06] text-white/80",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
