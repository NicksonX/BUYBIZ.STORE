"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, ShieldCheck } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";

type Turn = { role: "user" | "assistant"; content: string };

const starters = [
  "How do refunds work?",
  "What is the Personal proxy?",
  "How do referrals work?",
  "I need a human agent",
];

export function AiSupportAssistant({ configured = true }: { configured?: boolean }) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [typing, setTyping] = useState(false);
  const [retryText, setRetryText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (stickToBottom.current) node.scrollTop = node.scrollHeight;
  }, [turns, typing]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/support/ai/history", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { conversationId?: string | null; turns?: Turn[] } | null) => {
        if (!cancelled && data) {
          if (data.turns?.length) setTurns(data.turns);
          if (data.conversationId) setConversationId(data.conversationId);
        }
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setRestored(true); });
    return () => { cancelled = true; };
  }, []);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || pending || typing) return;
    setPending(true);
    setTyping(true);
    setNotice(null);
    setRetryText(null);
    // The timer starts when the user submits, not during render.
    // eslint-disable-next-line react-hooks/purity
    startedAtRef.current = performance.now();
    const history = turns.slice(-6);
    setTurns((current) => [...current, { role: "user", content: clean }]);
    setMessage("");
    try {
      const response = await fetch("/api/support/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, history, conversationId }),
      });
      const payload = (await response.json()) as {
        reply?: string;
        message?: string;
        flagged?: boolean;
        conversationId?: string;
        ticketNumber?: string | null;
      };
      if (!response.ok || !payload.reply) {
        setNotice(payload.message ?? "The assistant could not reply. Please open a ticket.");
        setRetryText(clean);
        return;
      }
      setConversationId(payload.conversationId ?? conversationId);
      // eslint-disable-next-line react-hooks/purity
      const minimum = 2000 - (performance.now() - startedAtRef.current);
      if (minimum > 0) await new Promise((resolve) => setTimeout(resolve, minimum));
      setTurns((current) => [
        ...current,
        { role: "assistant", content: payload.reply! },
      ]);
    } catch {
      setNotice("The assistant is unavailable right now. Please open a support ticket.");
      setRetryText(clean);
    } finally {
      setPending(false);
      setTyping(false);
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
            <h2 className="text-[12px] font-semibold">BUYBIZ AI Support</h2>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              Account-aware support. Read-only checks only.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2 py-1 text-[8.5px] text-muted-foreground">
          <ShieldCheck className="h-2.5 w-2.5" /> Guarded
        </span>
      </div>

      <div ref={scrollRef} className="max-h-[340px] space-y-3 overflow-y-auto p-4" onScroll={(event) => { const node = event.currentTarget; stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48; }}>
        {!configured ? (
          <p className="rounded-[8px] border border-warning/20 bg-warning-soft px-2.5 py-2 text-[9.5px] leading-4 text-warning">
            The AI assistant is not connected on this deployment yet. Open a
            support ticket and a human will reply.
          </p>
        ) : null}
        {!restored ? <p className="text-[9.5px] text-muted-foreground">Restoring your conversation…</p> : null}
        {restored && turns.length === 0 ? (
          <div>
            <p className="text-[10.5px] leading-5 text-muted-foreground">
              Hello! Welcome to BUYBIZ. I can help with proxy purchases, account
              questions, payments, referrals and rewards. How can I help you today?
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
        {typing ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-[11px] rounded-bl-[3px] border border-border bg-surface-subtle px-3 py-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[8px] text-background"><Bot className="h-3 w-3" /></span>
              <span className="text-[9px] font-medium text-muted-foreground">BUYBIZ AI Support is typing</span>
              <LoadingDots label="BUYBIZ AI Support is typing" />
            </div>
          </div>
        ) : null}
        {notice ? (
          <p className="rounded-[8px] border border-warning/20 bg-warning-soft px-2.5 py-2 text-[9.5px] leading-4 text-warning">
            {notice}{" "}
            {retryText ? <button type="button" onClick={() => void send(retryText)} className="ml-1 font-semibold underline">Retry</button> : null}
            <Link href="/dashboard/support/new" className="ml-1 font-semibold underline">
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
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (message.trim()) void send(message);
              }
            }}
            placeholder="Ask a support question… Enter to send, Shift+Enter for a new line"
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
            {pending ? <LoadingDots /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[8.5px] leading-4 text-muted-foreground">
          <p>Do not paste passwords, card details or proxy credentials. I cannot change your account.</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setTurns([]); setConversationId(null); setNotice(null); }} className="underline">Clear chat</button>
            <Link href="/dashboard/support/new" className="underline">Human support</Link>
          </div>
        </div>
      </form>
    </section>
  );
}
