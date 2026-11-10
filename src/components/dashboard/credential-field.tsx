"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { cn, maskValue } from "@/lib/utils";

export function CredentialField({
  label,
  value,
  secret = false,
  mono = true,
  hint,
  className,
}: {
  label: string;
  value: string | null;
  secret?: boolean;
  mono?: boolean;
  hint?: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(!secret);
  const display = value
    ? revealed
      ? value
      : maskValue(value, 2)
    : "Not required";

  return (
    <div className={cn("rounded-[10px] border border-border bg-surface-subtle p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <div className="flex items-center gap-1">
          {secret && value ? (
            <button
              type="button"
              onClick={() => setRevealed((current) => !current)}
              aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {revealed ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </button>
          ) : null}
          {value ? <CopyButton value={value} label="Copy" /> : null}
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 break-all text-[12px] font-medium text-foreground",
          mono && "font-mono text-[11.5px]",
        )}
      >
        {display}
      </p>
      {hint ? (
        <p className="mt-1 text-[9px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
