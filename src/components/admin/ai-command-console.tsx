"use client";
import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";

export function AiCommandConsole() {
  const [command, setCommand] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!command.trim() || pending) return;
    setPending(true); setError(null);
    try {
      const r = await fetch("/api/admin/ai-command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }) });
      const data = (await r.json()) as { reply?: string; message?: string };
      if (!r.ok || !data.reply) setError(data.message ?? "Command failed."); else setReply(data.reply);
    } catch { setError("The command centre is unavailable."); } finally { setPending(false); }
  }
  return (
    <div className="surface-card rounded-[16px] p-5">
      <div className="flex gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-foreground text-background"><Bot className="h-4 w-4" /></span><div><h2 className="text-[13px] font-semibold">BUYBIZ AI COMMAND CENTRE</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Read-only live operations. Gemini free tier when configured; deterministic fallback otherwise.</p></div></div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Ask about treasury, giveaways, claims or unpaid rewards…" className="h-11 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3 text-[12px] outline-none focus:border-foreground/30" aria-label="Admin command" /><button type="submit" disabled={pending || !command.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background disabled:opacity-45">{pending ? <LoadingDots label="Reading live data" /> : <Send className="h-3.5 w-3.5" />} Ask</button></form>
      {error ? <p className="mt-3 rounded-[8px] border border-danger/20 bg-danger-soft px-3 py-2 text-[10px] text-danger">{error}</p> : null}
      {reply ? <div className="mt-4 rounded-[10px] border border-border bg-surface-subtle p-3 text-[11px] leading-6 whitespace-pre-wrap">{reply}</div> : null}
      <p className="mt-3 text-[8.5px] text-muted-foreground">The assistant cannot sign, transfer, reveal codes, or change permissions. Use the relevant admin page for writes.</p>
    </div>
  );
}
