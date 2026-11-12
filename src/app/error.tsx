"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline = !useOnlineStatus();

  useEffect(() => {
    console.error("[buybiz] page error", error.message);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="surface-card w-full max-w-[460px] rounded-[18px] p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-danger/20 bg-danger-soft text-danger">
          {offline ? <WifiOff className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
        </span>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.035em]">
          {offline ? "You are offline." : "This page could not load."}
        </h1>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          {offline
            ? "Check your internet connection and try again. Your wallet was not charged by this page."
            : "The server could not complete this request. No financial action was taken by this screen. Please retry in a moment."}
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[9px] text-muted-foreground/60">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground text-[11px] font-semibold text-background hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-medium hover:bg-accent"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
