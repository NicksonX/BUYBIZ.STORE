"use client";

import { useActionState, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/validation/action-state";
import { initialActionState } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";

type AdminAction = (
  previous: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function AdminActionForm({
  action,
  children,
  hidden = {},
  submitLabel,
  pendingLabel,
  confirmMessage,
  variant = "primary",
  className,
  buttonClassName,
  compact = false,
}: {
  action: AdminAction;
  children?: ReactNode;
  hidden?: Record<string, string>;
  submitLabel: string;
  pendingLabel?: string;
  confirmMessage?: string;
  variant?: "primary" | "outline" | "danger" | "subtle";
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form
      action={formAction}
      className={cn("space-y-3", className)}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          compact ? "h-7 px-3 text-[10px]" : "h-9 px-4 text-[10.5px]",
          variant === "primary" && "bg-foreground text-background hover:opacity-90",
          variant === "outline" &&
            "border border-border bg-surface text-foreground hover:bg-accent",
          variant === "subtle" &&
            "border border-border bg-surface-subtle text-muted-foreground hover:text-foreground",
          variant === "danger" &&
            "border border-danger/25 bg-danger-soft text-danger hover:bg-danger/10",
          buttonClassName,
        )}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {pending ? (pendingLabel ?? "Saving…") : submitLabel}
      </button>
      {state.message ? (
        <p
          className={cn(
            "flex items-start gap-1.5 text-[9.5px] leading-4",
            state.status === "success" ? "text-success" : "text-danger",
          )}
        >
          {state.status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
          ) : null}
          {state.message}
        </p>
      ) : null}
      {state.fieldErrors ? (
        <ul className="space-y-0.5 text-[9px] leading-4 text-danger">
          {Object.entries(state.fieldErrors).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
