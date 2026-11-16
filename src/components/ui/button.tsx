import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingDots } from "@/components/ui/loading-dots";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:translate-y-[0.5px] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-primary/88",
        secondary:
          "border border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-accent",
        inverse:
          "bg-white text-[#0A0B0D] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_24px_-12px_rgba(0,0,0,0.6)] hover:bg-white/90",
        dark: "bg-[#0A0B0D] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#17181b]",
        danger:
          "bg-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-danger/90",
        dangerSoft:
          "border border-danger/25 bg-danger-soft text-danger hover:bg-danger/10",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px] tracking-[0.01em] [&_svg]:size-3.5",
        sm: "h-8 px-3 text-[12.5px] [&_svg]:size-3.5",
        md: "h-10 px-4 text-[13.5px] [&_svg]:size-4",
        lg: "h-12 px-6 text-[14.5px] [&_svg]:size-[18px]",
        icon: "h-9 w-9 [&_svg]:size-4",
        iconSm: "h-8 w-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoadingDots label="Processing request" /> : null}
      <span className={loading ? "opacity-90" : undefined}>{children}</span>
    </button>
  );
}
