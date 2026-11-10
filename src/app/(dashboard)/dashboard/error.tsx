"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="surface-card w-full max-w-md rounded-[16px] p-6 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-danger/20 bg-danger-soft text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold tracking-[-0.025em]">
          This page could not load.
        </h1>
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          No financial action was taken. If you were completing a purchase,
          check your orders before retrying. Reference:{" "}
          <span className="font-mono">{error.digest ?? "unknown"}</span>
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground text-[10.5px] font-semibold text-background"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-border text-[10.5px] font-medium hover:bg-accent"
          >
            Dashboard home
          </Link>
        </div>
      </div>
    </div>
  );
}
