"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, Loader2, Send, ShieldCheck } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };

const starters = [
  "How do refunds work?",
  "What is the Personal proxy?",
  "How do referrals work?",
];

export function AiSupportAssistant({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || pending) return;
    setPending(true);
    setNotice(null);
    const history = turns.slice(-6);
    setTurns((current) => [...current, { role: "user", content: clean }]);
    setMessage("");
    try {
      const response = await fetch("/api/support/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, history }),
      });
      const payload = (await response.json()) as {
        reply?: string;
        message?: string;
        flagged?: boolean;
      };
      if (!response.ok || !payload.reply) {
        setNotice(payload.message ?? "The assistant could not reply. Please open a ticket.");
        return;
      }
      setTurns((current) => [
        ...current,
        { role: "assistant", content: payload.reply! },
      ]);
    } catch {
      setNotice("The assistant is unavailable right now. Please open a support ticket.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="surface-card overflow-hidden rounded-[15px]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="flex gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface-subtle">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[12px] font-semibold">Ask BUYBIZ</h2>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              Public information only. No account changes.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2 py-1 text-[8.5px] text-muted-foreground">
          <ShieldCheck className="h-2.5 w-2.5" /> Guarded
        </span>
      </div>

      <div className="max-h-[340px] space-y-3 overflow-y-auto p-4">
        {!configured ? (
          <p className="rounded-[8px] border border-warning/20 bg-warning-soft px-2.5 py-2 text-[9.5px] leading-4 text-warning">
            The AI assistant is not connected on this deployment yet. Open a
            support ticket and a human will reply.
          </p>
        ) : null}
        {turns.length === 0 ? (
          <div>
            <p className="text-[10.5px] leading-5 text-muted-foreground">
              Ask about plans, the wallet, refunds, expiry or referrals. If you
              need something changed on your account, open a ticket.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void send(starter)}
                  disabled={!configured}
                  className="rounded-full border border-border bg-surface px-2.5 py-1.5 text-[9.5px] text-muted-foreground hover:text-foreground"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, index) => (
            <div
              key={`${turn.role}-${index}`}
              className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  turn.role === "user"
                    ? "max-w-[88%] rounded-[11px] rounded-br-[3px] bg-foreground px-3 py-2.5 text-[10.5px] leading-5 text-background"
                    : "max-w-[88%] rounded-[11px] rounded-bl-[3px] border border-border bg-surface-subtle px-3 py-2.5 text-[10.5px] leading-5 text-foreground"
                }
              >
                <p className="whitespace-pre-wrap">{turn.content}</p>
              </div>
            </div>
          ))
        )}
        {pending ? (
          <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking public info…
          </div>
        ) : null}
        {notice ? (
          <p className="rounded-[8px] border border-warning/20 bg-warning-soft px-2.5 py-2 text-[9.5px] leading-4 text-warning">
            {notice}{" "}
            <Link href="/dashboard/support/new" className="font-semibold underline">
              Open a ticket
            </Link>
          </p>
        ) : null}
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(message);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask a support question…"
            maxLength={1200}
            rows={2}
            className="min-h-11 flex-1 resize-none rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[11px] outline-none focus:border-foreground/25"
            aria-label="Ask BUYBIZ support"
          />
          <button
            type="submit"
            disabled={!configured || pending || !message.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
            aria-label="Send question"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[8.5px] leading-4 text-muted-foreground">
          Do not paste passwords, card details or proxy credentials. The
          assistant cannot change your wallet, orders or account.{" "}
          <Link href="/dashboard/support/new" className="underline">
            Human support
          </Link>
          .
        </p>
      </form>
    </section>
  );
}
