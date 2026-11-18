"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Fast enough for an active support conversation, then backs off. */
export function SupportAutoRefresh({ intervalMs = 12000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let ticks = 0;
    const schedule = () => {
      if (cancelled) return;
      const delay = ticks < 5 ? Math.max(intervalMs, 5000) : 30000;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
        ticks += 1;
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [intervalMs, router]);
  return null;
}
