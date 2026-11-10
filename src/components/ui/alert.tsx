import { AlertCircle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: { wrap: "border-info/20 bg-info-soft text-info", Icon: Info },
  success: {
    wrap: "border-success/20 bg-success-soft text-success",
    Icon: CheckCircle2,
  },
  warning: {
    wrap: "border-warning/25 bg-warning-soft text-warning",
    Icon: ShieldAlert,
  },
  danger: { wrap: "border-danger/20 bg-danger-soft text-danger", Icon: AlertCircle },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  icon = true,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: boolean;
}) {
  const { wrap, Icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-[10px] border px-3.5 py-3", wrap, className)}
    >
      {icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <div className="min-w-0 text-[12.5px] leading-5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
