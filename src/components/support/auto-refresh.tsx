"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Lightweight fallback when realtime sockets are unavailable. */
export function SupportAutoRefresh({ intervalMs = 12000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
    };
    const timer = window.setInterval(tick, Math.max(intervalMs, 5000));
    return () => window.clearInterval(timer);
  }, [intervalMs, router]);
  return null;
}
