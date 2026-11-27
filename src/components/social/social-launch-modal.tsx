"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";

const X_URL = "https://x.com/buybiz_company";
const TELEGRAM_URL = "https://t.me/buybizoffical";
function XIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.2l-4.9-6.4L6.5 22H3.4l7.2-8.3L2.8 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.4 3.8H5.6L17.8 20Z"/></svg>; }
function TelegramIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M21.8 3.3 2.9 10.6c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.8 5.6c.2.6.4.8 1 .8.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.6-1.9ZM9.4 14.8l10.8-6.8c.5-.3.9-.1.5.2l-8.7 7.9-.3 3.1-1.3-3.5-1-1Z"/></svg>; }

const SOCIAL_DISMISS_KEY = "buybiz_social_launch_last_dismissed";
const SOCIAL_48H = 48 * 60 * 60 * 1000;

export function SocialLaunchModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/rewards/proof")) return;
    let cancelled = false;
    fetch("/api/featured-tasks/popup", { cache: "no-store" }).then((response) => response.json()).then((data: { task?: unknown }) => {
      if (!cancelled && data.task) return;
      if (!cancelled) run();
    }).catch(() => { if (!cancelled) run(); });
    function run() {
    try {
      const last = Number(localStorage.getItem(SOCIAL_DISMISS_KEY) ?? 0);
      if (last && Date.now() - last < SOCIAL_48H) return;
      sessionStorage.setItem("buybiz_social_launch_shown", "1");
    } catch { /* ignore */ }
      const timer = window.setTimeout(() => setOpen(true), 1400);
      return () => window.clearTimeout(timer);
    }
    return () => { cancelled = true; };
  }, [pathname]);
  function dismiss() {
    try { localStorage.setItem(SOCIAL_DISMISS_KEY, String(Date.now())); sessionStorage.setItem("buybiz_social_launch_shown", "1"); } catch { /* ignore */ }
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:items-center sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="social-launch-title" className="w-full max-w-[470px] overflow-hidden rounded-[18px] border border-black/10 bg-white text-[#0A0B0D] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)]">
        <div className="relative bg-[#0A0B0D] px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[16px]">✦</span><button type="button" onClick={dismiss} aria-label="Close social announcement" className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
          <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">BUYBIZ community</p>
          <h2 id="social-launch-title" className="mt-2 text-[25px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[29px]">🎉 We’re Officially on Socials!</h2>
        </div>
        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="space-y-3 text-[11.5px] leading-5 text-[#4E5157]"><p>We have some exciting news! BUYBIZ has officially launched its social channels.</p><p>Join our community to stay connected, receive important updates, discover new products and services when they become available, get notified about upcoming giveaways, and never miss what’s happening at BUYBIZ.</p><p className="font-medium text-[#0A0B0D]">We’re growing, and we want you to be part of the journey.</p></div>
          <div className="mt-5 grid gap-2"><a href={X_URL} onClick={dismiss} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0A0B0D] px-4 text-[11px] font-semibold text-white transition-opacity hover:opacity-85"><XIcon /> Follow us on X <ArrowUpRight className="h-3.5 w-3.5" /></a><a href={TELEGRAM_URL} onClick={dismiss} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 text-[11px] font-semibold text-[#0A0B0D] transition-colors hover:bg-[#F4F4F5]"><TelegramIcon /> Join our Telegram <ArrowUpRight className="h-3.5 w-3.5" /></a><button type="button" onClick={dismiss} className="min-h-10 rounded-full px-4 text-[10px] font-medium text-[#6E7178] transition-colors hover:text-[#0A0B0D]">Maybe later</button></div>
          <p className="mt-3 text-center text-[8.5px] text-[#8C9097]">Official BUYBIZ channels only. Verify the handle before following.</p>
        </div>
      </div>
    </div>
  );
}
