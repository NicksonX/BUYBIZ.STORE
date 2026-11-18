"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, ChevronDown, Maximize2, Minimize2, Wallet, X } from "lucide-react";
import { AiCommandConsole } from "@/components/admin/ai-command-console";
import { Web3WalletPanel } from "@/components/admin/web3-wallet-panel";

type Kind = "wallet" | "ai";
type WindowState = { x: number; y: number; width: number; height: number; minimized: boolean; maximized: boolean };
const DEFAULTS: Record<Kind, WindowState> = {
  wallet: { x: 28, y: 110, width: 390, height: 510, minimized: false, maximized: false },
  ai: { x: 440, y: 110, width: 450, height: 560, minimized: false, maximized: false },
};
const STORAGE = "buybiz_admin_floating_windows_v1";

function useWindowState(kind: Kind) {
  const [state, setState] = useState<WindowState>(DEFAULTS[kind]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}") as Record<string, WindowState>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved[kind]) setState({ ...DEFAULTS[kind], ...saved[kind], maximized: false });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, [kind]);
  useEffect(() => {
    if (!loaded) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}") as Record<string, WindowState>;
      saved[kind] = state;
      localStorage.setItem(STORAGE, JSON.stringify(saved));
    } catch { /* ignore */ }
  }, [kind, loaded, state]);
  return [state, setState] as const;
}

function FloatingWindow({ title, icon, z, onFocus, state, setState, onClose, children }: {
  title: string; icon: React.ReactNode; z: number; onFocus: () => void; state: WindowState;
  setState: React.Dispatch<React.SetStateAction<WindowState>>; onClose: () => void; children: React.ReactNode;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    if (window.innerWidth < 768 || state.maximized) return;
    drag.current = { dx: e.clientX - state.x, dy: e.clientY - state.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const width = Math.min(window.innerWidth - 12, Math.max(320, state.width));
    setState((s) => ({ ...s, x: Math.max(4, Math.min(window.innerWidth - width - 4, e.clientX - drag.current!.dx)), y: Math.max(4, Math.min(window.innerHeight - 44, e.clientY - drag.current!.dy)) }));
  }
  function endDrag() { drag.current = null; }
  function startResize(e: React.PointerEvent) {
    e.stopPropagation();
    resize.current = { x: e.clientX, y: e.clientY, w: state.width, h: state.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHeaderKeyDown(e: React.KeyboardEvent) {
    if (state.maximized || window.innerWidth < 768) return;
    const step = e.shiftKey ? 40 : 12;
    const delta = e.key === "ArrowLeft" ? [-step, 0] : e.key === "ArrowRight" ? [step, 0] : e.key === "ArrowUp" ? [0, -step] : e.key === "ArrowDown" ? [0, step] : null;
    if (!delta) return;
    e.preventDefault();
    setState((s) => ({ ...s, x: Math.max(4, Math.min(window.innerWidth - s.width - 4, s.x + delta[0])), y: Math.max(4, Math.min(window.innerHeight - 44, s.y + delta[1])) }));
  }
  function onResize(e: React.PointerEvent) {
    if (!resize.current) return;
    setState((s) => ({ ...s, width: Math.max(320, resize.current!.w + e.clientX - resize.current!.x), height: Math.max(260, resize.current!.h + e.clientY - resize.current!.y) }));
  }

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const style = state.maximized || mobile
    ? { left: 8, right: 8, bottom: 8, top: mobile ? "auto" : 8, height: mobile ? "72dvh" : "auto", width: "auto" }
    : { left: state.x, top: state.y, width: state.width, height: state.height };
  return (
    <section role="dialog" aria-modal="false" onPointerDown={onFocus} className={`fixed flex flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#0A0B0D] text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] ${state.minimized ? "hidden" : ""}`} style={{ ...style, zIndex: z }} aria-label={title}>
      <header tabIndex={0} aria-label={`${title} drag handle`} className="flex cursor-grab items-center gap-2 border-b border-white/10 px-3 py-2.5 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#B9FF66]" onKeyDown={onHeaderKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-white/10">{icon}</span>
        <p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">{title}</p>
        <button type="button" onClick={() => setState((s) => ({ ...s, minimized: true }))} aria-label="Minimize" className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10"><ChevronDown className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => setState((s) => ({ ...s, maximized: !s.maximized }))} aria-label="Maximize or restore" className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10">{state.maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F4F5] p-3 text-[#0A0B0D]">{children}</div>
      {!mobile ? <button type="button" aria-label="Resize window" onPointerDown={startResize} onPointerMove={onResize} onPointerUp={() => { resize.current = null; }} className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize border-b-2 border-r-2 border-white/25" /> : null}
    </section>
  );
}

function TreasurySnapshot() {
  const [snapshot, setSnapshot] = useState<{ wallet: { address: string; enabled: boolean } | null; balance: { available: boolean; usdt?: number; bnb?: number; error?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    try { const r = await fetch("/api/admin/treasury-snapshot", { cache: "no-store" }); setSnapshot(await r.json()); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  return <div className="space-y-3">
    <div className="rounded-[10px] bg-[#0A0B0D] p-3 text-white">
      <div className="flex items-center justify-between"><p className="text-[8px] uppercase tracking-[0.12em] text-white/45">Treasury · USDT BEP20</p><button type="button" onClick={() => void load()} className="text-[8px] text-white/60 underline">Refresh</button></div>
      {loading ? <p className="mt-2 text-[9px] text-white/50">Reading BSC…</p> : snapshot?.balance.available ? <p className="tabular mt-2 text-[26px] font-semibold">{snapshot.balance.usdt?.toFixed(4)} <span className="text-[11px] text-white/45">USDT</span></p> : <p className="mt-2 text-[9px] text-warning">{snapshot?.balance.error ?? "Treasury not configured."}</p>}
      {snapshot?.wallet ? <p className="mt-2 break-all font-mono text-[7.5px] text-white/45">{snapshot.wallet.address}</p> : null}
    </div>
    <Web3WalletPanel />
    <Link href="/admin/treasury" className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[8.5px] font-medium">Open full treasury <Maximize2 className="ml-1 h-3 w-3" /></Link>
  </div>;
}

export function AdminFloatingTools({ role }: { role: string }) {
  const canUseFinancialTools = role !== "support";
  const [open, setOpen] = useState<{ wallet: boolean; ai: boolean }>({ wallet: false, ai: false });
  const [front, setFront] = useState<"wallet" | "ai">("ai");
  const [walletState, setWalletState] = useWindowState("wallet");
  const [aiState, setAiState] = useWindowState("ai");
  if (!canUseFinancialTools) return null;
  return (
    <>
      <div className="fixed bottom-5 left-4 z-[80] flex flex-col gap-2 lg:bottom-6 lg:left-[264px]">
        <button type="button" data-testid="floating-treasury" onClick={() => setOpen((s) => ({ ...s, wallet: !s.wallet }))} aria-label="Open Treasury Wallet" title="Treasury Wallet" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-[#0A0B0D] px-3 text-white shadow-float transition-transform hover:scale-[1.03] active:scale-95"><Wallet className="h-4 w-4" /><span className="text-[8.5px] font-semibold uppercase tracking-[0.08em]">Treasury</span></button>
        <button type="button" data-testid="floating-ai" onClick={() => setOpen((s) => ({ ...s, ai: !s.ai }))} aria-label="Open AI Command Centre" title="AI Command Centre" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#B9FF66]/30 bg-[#0A0B0D] px-3 text-[#B9FF66] shadow-float transition-transform hover:scale-[1.03] active:scale-95"><Bot className="h-4 w-4" /><span className="text-[8.5px] font-semibold uppercase tracking-[0.08em]">AI</span></button>
      </div>
      {open.wallet ? <FloatingWindow title="Treasury Wallet" icon={<Wallet className="h-3.5 w-3.5" />} z={front === "wallet" ? 72 : 71} onFocus={() => setFront("wallet")} state={walletState} setState={setWalletState} onClose={() => setOpen((s) => ({ ...s, wallet: false }))}><TreasurySnapshot /></FloatingWindow> : null}
      {open.ai ? <FloatingWindow title="BUYBIZ AI Command Centre" icon={<Bot className="h-3.5 w-3.5" />} z={front === "ai" ? 72 : 71} onFocus={() => setFront("ai")} state={aiState} setState={setAiState} onClose={() => setOpen((s) => ({ ...s, ai: false }))}><AiCommandConsole /></FloatingWindow> : null}
    </>
  );
}
