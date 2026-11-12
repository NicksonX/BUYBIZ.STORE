"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

export function NetworkStatus() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[80] flex items-center justify-between gap-3 border-b border-white/10 bg-[#0A0B0D] px-4 py-2.5 text-white shadow-lg"
    >
      <div className="flex min-w-0 items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
        <p className="truncate text-[11px] text-white/75">
          You are offline. Check your connection.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[10px] font-semibold text-white"
      >
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    </div>
  );
}
