"use client";

import { useEffect, useState } from "react";
import { Wrench, X } from "lucide-react";

export function ProxyMaintenanceBanner({ paused, announcementId }: { paused: boolean; announcementId: string | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!paused) return setVisible(false);
    const key = `buybiz_proxy_banner_dismissed:${announcementId ?? "proxy-maintenance"}`;
    try { setVisible(localStorage.getItem(key) !== "1"); } catch { setVisible(true); }
  }, [paused, announcementId]);
  if (!paused || !visible) return null;
  function dismiss() {
    try { localStorage.setItem(`buybiz_proxy_banner_dismissed:${announcementId ?? "proxy-maintenance"}`, "1"); } catch { /* ignore */ }
    setVisible(false);
  }
  return (
    <div role="status" className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-border bg-surface-subtle px-3 py-2.5 text-muted-foreground">
      <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 flex-1 text-[10px] leading-4">Proxy services are undergoing maintenance. Purchases and new activations are temporarily paused. We expect to be back within the next few hours.</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss maintenance banner" className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-surface"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}
