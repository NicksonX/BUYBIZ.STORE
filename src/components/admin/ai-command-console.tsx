"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, CircleDollarSign, Copy, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";

type Action = { id: string; type: string; title: string; details: string[] };
type Message = { id?: string; command: string; reply: string; mode?: string; createdAt?: string; data?: { treasury?: { available?: boolean; usdt?: number; bnb?: number }; claims?: number; unpaidClaims?: number }; action?: Action; actionStatus?: string; result?: Record<string, unknown> };
const starters = ["Show me the treasury balance", "How many giveaway claims are unpaid?", "Is the giveaway live?", "What is the current giveaway status?"];

export function AiCommandConsole() {
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [snapshot, setSnapshot] = useState<Message["data"] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/ai-command", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data: { history?: Array<{ id: string; command: string; response: string; mode: string; createdAt: string; status: string; actionType: string | null }>; snapshot?: Message["data"] } | null) => {
      if (!cancelled && data?.history) setMessages(data.history.map((h) => ({ id: h.id, command: h.command, reply: h.response, mode: h.mode, createdAt: h.createdAt, actionStatus: h.status, action: h.actionType ? { id: h.id, type: h.actionType, title: h.actionType.replaceAll("_", " "), details: [] } : undefined })));
      if (!cancelled && data?.snapshot) setSnapshot(data.snapshot);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, pending]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await ask(command);
  }
  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || pending) return;
    setPending(true); setError(null); setCommand("");
    try {
      const r = await fetch("/api/admin/ai-command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: clean }) });
      const data = (await r.json()) as { reply?: string; message?: string; mode?: string; data?: Message["data"]; action?: Action };
      if (!r.ok || !data.reply) { setError(data.message ?? "Command failed."); }
      else setMessages((current) => [...current, { command: clean, reply: data.reply!, mode: data.mode, data: data.data, action: data.action, createdAt: new Date().toISOString() }]);
    } catch { setError("The command centre is unavailable. Try again."); } finally { setPending(false); }
  }
  async function confirmAction(message: Message, index: number) {
    if (!message.action || confirming) return;
    setConfirming(message.action.id); setError(null);
    try {
      const r = await fetch("/api/admin/ai-command/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionId: message.action.id }) });
      const data = (await r.json()) as { ok?: boolean; result?: Record<string, unknown>; message?: string };
      if (!r.ok || !data.ok) setError(data.message ?? "Action failed.");
      else setMessages((current) => current.map((m, i) => i === index ? { ...m, actionStatus: "completed", result: data.result } : m));
    } catch { setError("Action confirmation failed."); } finally { setConfirming(null); }
  }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* noop */ } }

  return (
    <div className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-[12px] bg-[#F6F6F7] text-[#0A0B0D]">
      <div className="flex items-center justify-between border-b border-[#E3E4E7] bg-white px-4 py-3">
        <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#0A0B0D] text-white"><Bot className="h-3.5 w-3.5" /></span><div><p className="text-[11px] font-semibold">BUYBIZ Command Assistant</p><p className="text-[8.5px] text-[#686C74]">Live BUYBIZ operations · approval required for writes</p></div></div>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[#F7F7F8] px-2 py-1 text-[7px] font-medium text-[#686C74]"><span className="h-1 w-1 rounded-full bg-[#686C74]" /> Live data</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? <><div className="grid grid-cols-3 gap-1.5"><div className="rounded-[8px] border border-border bg-white p-2"><p className="text-[6.5px] uppercase tracking-[0.08em] text-[#686C74]">Treasury USDT</p><p className="tabular mt-1 text-[13px] font-semibold">{snapshot?.treasury?.usdt?.toFixed(2) ?? "—"}</p></div><div className="rounded-[8px] border border-border bg-white p-2"><p className="text-[6.5px] uppercase tracking-[0.08em] text-[#686C74]">Unpaid claims</p><p className="tabular mt-1 text-[13px] font-semibold">{snapshot?.unpaidClaims ?? "—"}</p></div><div className="rounded-[8px] border border-border bg-white p-2"><p className="text-[6.5px] uppercase tracking-[0.08em] text-[#686C74]">Total claims</p><p className="tabular mt-1 text-[13px] font-semibold">{snapshot?.claims ?? "—"}</p></div></div><div className="rounded-[10px] border border-[#E3E4E7] bg-white p-3"><p className="text-[10px] font-medium">Ask about live BUYBIZ operations.</p><p className="mt-1 text-[8.5px] leading-4 text-[#686C74]">I can read treasury, giveaway, claim and payment status. I cannot sign transactions or change permissions.</p><div className="mt-3 grid gap-1.5">{starters.map((starter) => <button key={starter} type="button" onClick={() => void ask(starter)} className="flex items-center gap-1.5 rounded-[7px] bg-[#F7F7F8] px-2 py-1.5 text-left text-[8.5px] text-[#686C74] hover:text-[#0A0B0D]"><Sparkles className="h-2.5 w-2.5" /> {starter}</button>)}</div></div><div className="grid grid-cols-3 gap-1.5"><span className="rounded-[7px] border border-[#E3E4E7] bg-white px-2 py-2 text-center text-[7.5px] text-[#686C74]">Treasury</span><span className="rounded-[7px] border border-[#E3E4E7] bg-white px-2 py-2 text-center text-[7.5px] text-[#686C74]">Giveaways</span><span className="rounded-[7px] border border-[#E3E4E7] bg-white px-2 py-2 text-center text-[7.5px] text-[#686C74]">Claims</span></div></> : null}
        {messages.map((message, i) => <div key={`${message.createdAt}-${i}`} className="space-y-1.5">
          <div className="flex justify-end"><p className="max-w-[88%] rounded-[10px] rounded-br-[3px] bg-[#0A0B0D] px-2.5 py-2 text-[9px] leading-4 text-white">{message.command}</p></div>
          <div className="rounded-[10px] border border-[#E3E4E7] bg-white p-2.5"><div className="flex items-start justify-between gap-2"><p className="whitespace-pre-wrap text-[9px] leading-4">{message.reply}</p><button type="button" onClick={() => void copy(message.reply)} aria-label="Copy response" className="shrink-0 text-[#686C74] hover:text-[#0A0B0D]">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</button></div>
            {message.data ? <div className="mt-2 grid grid-cols-2 gap-1.5"><div className="rounded-[6px] bg-[#F7F7F8] p-1.5"><p className="text-[6.5px] uppercase text-[#686C74]">USDT</p><p className="text-[10px] font-semibold">{message.data.treasury?.usdt?.toFixed(4) ?? "—"}</p></div><div className="rounded-[6px] bg-[#F7F7F8] p-1.5"><p className="text-[6.5px] uppercase text-[#686C74]">Unpaid claims</p><p className="text-[10px] font-semibold">{message.data.unpaidClaims ?? "—"}</p></div></div> : null}
            {message.action ? <div className="mt-2 rounded-[8px] border border-[#0A0B0D]/15 bg-[#F6F6F7] text-[#0A0B0D] p-2"><p className="text-[8px] font-semibold uppercase tracking-[0.08em]">{message.action.title}</p>{message.action.details.length ? <ul className="mt-1 list-inside list-disc text-[7.5px] leading-4 text-[#686C74]">{message.action.details.map((d) => <li key={d}>{d}</li>)}</ul> : null}{message.actionStatus === "pending_approval" ? <button type="button" onClick={() => void confirmAction(message, i)} disabled={confirming === message.action.id} className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-[#0A0B0D] px-2.5 text-[8px] font-semibold text-white disabled:opacity-50">{confirming === message.action.id ? <LoadingDots label="Executing approved action" /> : <Check className="h-3 w-3" />} Confirm & execute</button> : <p className={`mt-1.5 text-[7.5px] ${message.actionStatus === "failed" ? "text-danger" : "text-success"}`}>{message.actionStatus === "failed" ? "Action failed." : message.actionStatus === "completed" ? "Action completed." : message.actionStatus ?? ""}{message.result?.code ? ` Claim code: ${String(message.result.code)}` : ""}</p>}</div> : null}
            <p className="mt-1.5 flex items-center gap-1 text-[6.5px] text-[#686C74]"><ShieldCheck className="h-2.5 w-2.5" /> {message.mode === "gemini" ? "Gemini · live context" : message.mode === "approval" ? "Prepared action · awaiting owner approval" : "Deterministic · live context"} · {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</p>
          </div>
        </div>)}
        {pending ? <div className="flex items-center gap-2 rounded-[9px] border border-[#E3E4E7] bg-white px-2.5 py-2 text-[8.5px] text-[#686C74]"><LoadingDots label="Checking live BUYBIZ data" /> Checking live BUYBIZ data…</div> : null}
        {error ? <p className="rounded-[7px] border border-danger/20 bg-danger-soft p-2 text-[8.5px] text-danger">{error}</p> : null}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="border-t border-[#E3E4E7] bg-white p-2.5"><div className="flex items-end gap-2"><textarea value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (command.trim()) void ask(command); } }} rows={2} placeholder="Ask about treasury, giveaways, claims…" className="min-h-9 flex-1 resize-none rounded-[8px] border border-[#E5E6E9] bg-white px-2 py-1.5 text-[9px] text-[#0A0B0D] outline-none placeholder:text-[#686C74] focus:border-[#0A0B0D]/30" /><button type="submit" disabled={pending || !command.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0B0D] text-white disabled:opacity-40" aria-label="Send command">{pending ? <LoadingDots /> : <Send className="h-3.5 w-3.5" />}</button></div><p className="mt-1.5 flex items-center gap-1 text-[6.5px] text-[#686C74]"><CircleDollarSign className="h-2.5 w-2.5" /> No signing or transfers from this panel.</p></form>
    </div>
  );
}
