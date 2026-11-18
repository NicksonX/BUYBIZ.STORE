"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-[560px] items-center justify-center px-4">
      <div className="w-full rounded-[16px] border border-border bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[10px] bg-danger-soft text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold">This admin page could not load</h1>
        <p className="mx-auto mt-2 max-w-[400px] text-[11px] leading-5 text-muted-foreground">
          No financial action was completed. Retry the page. If the problem continues, check the audit log and contact the platform owner.
        </p>
        <button type="button" onClick={() => reset()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[11px] font-semibold text-background">
          <RefreshCw className="h-3.5 w-3.5" /> Retry page
        </button>
      </div>
    </div>
  );
}
