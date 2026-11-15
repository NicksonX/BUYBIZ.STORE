"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, X } from "lucide-react";
import { AiSupportAssistant } from "@/components/support/ai-assistant";

export function FloatingSupport() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => {
        if (!cancelled) setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [pathname]);

  const hidden =
    !authenticated ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard/support") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");
  if (hidden) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open BUYBIZ AI Support"
          className="fixed bottom-20 right-4 z-[60] flex h-12 items-center gap-2 rounded-full bg-[#0A0B0D] px-4 text-[11px] font-semibold text-white shadow-[0_14px_35px_-12px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.02] sm:bottom-6"
        >
          <Bot className="h-4 w-4" /> AI Support
        </button>
      ) : (
        <div className="fixed inset-x-2 bottom-2 z-[70] max-h-[88dvh] overflow-y-auto rounded-[16px] border border-border bg-background shadow-[0_30px_80px_-25px_rgba(0,0,0,0.6)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold"><Bot className="h-3.5 w-3.5" /> BUYBIZ AI Support</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Minimize support" className="flex h-7 w-7 items-center justify-center rounded-full border border-border"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="p-2"><AiSupportAssistant configured /></div>
        </div>
      )}
    </>
  );
}
