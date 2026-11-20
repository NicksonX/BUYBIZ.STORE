"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Wrench } from "lucide-react";
import type { DashboardAnnouncement } from "@/server/services/announcements";

const keyFor = (id: string) => `buybiz_announcement_dismissed:${id}`;

export function MaintenanceAnnouncement({ announcement }: { announcement: DashboardAnnouncement | null }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!announcement) return;
    try {
      if (window.localStorage.getItem(keyFor(announcement.id)) === "1") return;
    } catch {
      // Storage can be unavailable in private browsing; show it for this load.
    }
    setOpen(true);
  }, [announcement]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function dismiss() {
    if (announcement) {
      try { window.localStorage.setItem(keyFor(announcement.id), "1"); } catch { /* ignore */ }
    }
    setOpen(false);
  }

  if (!announcement || !open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#07100B]/70 p-3 backdrop-blur-[3px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="maintenance-title" aria-describedby="maintenance-message" className="w-full max-w-[520px] overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_30px_100px_-25px_rgba(0,0,0,0.55)]">
        <div className="relative overflow-hidden bg-[#0A0F0C] px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6 sm:pt-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#C8A45A]/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F3D99A]/25 bg-[#F3D99A]/10 text-[#F3D99A]"><Wrench className="h-4.5 w-4.5" /></span>
            <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/50">Service notice</span>
          </div>
          <h2 id="maintenance-title" className="relative mt-4 text-[22px] font-semibold leading-[1.12] tracking-[-0.04em] sm:text-[25px]">{announcement.title}</h2>
          <p className="relative mt-2 text-[10px] text-white/45">An update from the BUYBIZ team.</p>
        </div>
        <div className="px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div id="maintenance-message" className="space-y-3 text-[11px] leading-5 text-muted-foreground sm:text-[11.5px]">
            {announcement.message.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[8.5px] text-muted-foreground"><Check className="h-3 w-3 shrink-0 text-success" /> We will update you when normal service is restored.</div>
          <button type="button" onClick={dismiss} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-foreground px-4 text-[11px] font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">OK</button>
          <p className="mt-2 text-center text-[8px] text-muted-foreground">You can continue using your dashboard after dismissing this message.</p>
        </div>
      </div>
    </div>
  );
}
