"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISS_KEY = "buybiz_install_prompt_dismissed_v1";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY) === "1" || isStandalone()) return; } catch { return; }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (isIos()) { setMode("ios"); return; }
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as InstallEvent); setMode("android"); };
    const onInstalled = () => { setMode(null); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  function dismiss() { try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } setMode(null); }
  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") { setMode(null); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } }
    setDeferred(null);
  }

  if (!mode) return null;
  return (
    <aside aria-label="Install BUYBIZ" className="surface-card mt-4 rounded-[12px] border border-border p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-subtle"><Smartphone className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-semibold">Install BUYBIZ</p><button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-subtle"><X className="h-3.5 w-3.5" /></button></div>
          <p className="mt-0.5 text-[9px] leading-4 text-muted-foreground">Get quicker access to your dashboard, manage your proxies and stay updated with important notifications.</p>
          {mode === "ios" ? <p className="mt-2 flex items-start gap-1.5 rounded-[7px] bg-surface-subtle px-2 py-1.5 text-[8.5px] leading-4 text-muted-foreground"><Share2 className="mt-0.5 h-3 w-3 shrink-0" /> On iPhone or iPad, open Safari’s Share menu, then choose <strong className="font-medium text-foreground">Add to Home Screen</strong>.</p> : <button type="button" onClick={install} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-[9.5px] font-semibold text-background"><Download className="h-3 w-3" /> Install App</button>}
          <button type="button" onClick={dismiss} className="ml-2 mt-2 min-h-9 rounded-full px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground">Maybe later</button>
        </div>
      </div>
    </aside>
  );
}
