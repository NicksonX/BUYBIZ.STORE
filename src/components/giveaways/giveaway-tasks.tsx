"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { ArrowUpRight, Check, ExternalLink, MessageCircle, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { completeGiveawayTaskAction } from "@/server/actions/giveaways";
import { initialActionState } from "@/lib/validation/action-state";
import { LoadingDots } from "@/components/ui/loading-dots";

const X_URL = "https://x.com/buybiz_company";
const TELEGRAM_URL = "https://t.me/buybizoffical";
const TASKS = [
  { key: "follow_x", title: "Follow BUYBIZ on X", description: "Follow our official X account to stay connected with BUYBIZ updates and announcements.", action: "Follow on X", href: X_URL, icon: "X" },
  { key: "like_post", title: "Like our giveaway post", description: "Visit our official giveaway post on X and give it a like to complete this task.", action: "Like Giveaway Post", href: "post", icon: "♥" },
  { key: "repost_quote", title: "Retweet and quote the giveaway", description: "Share our giveaway post with your followers by reposting and adding your own quote.", action: "Retweet & Quote", href: "post", icon: "↻" },
  { key: "join_telegram", title: "Join our Telegram channel", description: "Join the official BUYBIZ Telegram channel to receive announcements, updates and future opportunities.", action: "Join Telegram", href: TELEGRAM_URL, icon: "TG" },
] as const;

function TaskCard({ task, giveawayId, postUrl, completed, onCompleted }: { task: (typeof TASKS)[number]; giveawayId: string; postUrl: string | null; completed: boolean; onCompleted: (key: string) => void }) {
  const [state, action, pending] = useActionState(completeGiveawayTaskAction, initialActionState);
  const [opened, setOpened] = useState(false);
  const href = task.href === "post" ? postUrl : task.href;
  const unavailable = task.href === "post" && !postUrl;
  useEffect(() => { if (state.status === "success" && !completed) onCompleted(task.key); }, [state.status, completed, task.key, onCompleted]);
  return (
    <article className={`rounded-[11px] border p-3.5 transition-colors sm:p-4 ${completed ? "border-[#3FBF7F]/30 bg-[#F3FBF6]" : "border-border bg-surface"}`}>
      <div className="flex items-start gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${completed ? "border-[#3FBF7F]/30 bg-white text-[#16794A]" : "border-border bg-surface-subtle text-muted-foreground"}`}>{completed ? <Check className="h-4 w-4" /> : task.icon}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-semibold"><span className="mr-1 text-muted-foreground">{String(TASKS.indexOf(task) + 1).padStart(2, "0")}</span>{task.title}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{task.description}</p></div><span className={`rounded-full px-2 py-0.5 text-[7.5px] font-medium ${completed ? "bg-[#E4F7EC] text-[#16794A]" : opened ? "bg-warning-soft text-warning" : "bg-surface-subtle text-muted-foreground"}`}>{completed ? "Completed" : opened ? "Link opened" : "Not started"}</span></div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {unavailable ? <span className="text-[8.5px] text-warning">Official giveaway post URL is not configured yet.</span> : <a href={href!} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[9px] font-medium hover:bg-accent">{task.action} <ExternalLink className="h-3 w-3" /></a>}
            {!completed ? <form action={action} className="space-y-1"><input type="hidden" name="giveawayId" value={giveawayId} /><input type="hidden" name="taskKey" value={task.key} />{task.key === "repost_quote" ? <div className="flex flex-wrap gap-2"><label className="inline-flex items-center gap-1 text-[8px] text-muted-foreground"><input type="checkbox" name="reposted" className="h-3 w-3 accent-foreground" /> Reposted</label><label className="inline-flex items-center gap-1 text-[8px] text-muted-foreground"><input type="checkbox" name="quoted" className="h-3 w-3 accent-foreground" /> Quoted</label></div> : null}<button type="submit" disabled={pending || unavailable || (task.key === "repost_quote" && !opened)} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-foreground px-3 text-[8.5px] font-semibold text-background disabled:cursor-not-allowed disabled:opacity-35">{pending ? <LoadingDots label="Saving task" /> : <ShieldCheck className="h-3 w-3" />} {pending ? "Saving…" : "Mark as done"}</button></form> : null}
          </div>
          {state.message && state.status === "error" ? <p className="mt-1.5 text-[8px] leading-4 text-danger">{state.message}</p> : null}
          <p className="mt-1.5 text-[7.5px] leading-3.5 text-muted-foreground">Self-reported completion. Opening a link alone is not treated as verified.</p>
        </div>
      </div>
    </article>
  );
}

export function GiveawayTasks({ giveawayId, postUrl, completedTasks }: { giveawayId: string; postUrl: string | null; completedTasks: string[] }) {
  const [done, setDone] = useState<Set<string>>(() => new Set(completedTasks));
  const count = done.size;
  return (
    <section id="giveaway-tasks" className="surface-card scroll-mt-24 overflow-hidden rounded-[13px]">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-[13px] font-semibold">Giveaway tasks</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Complete all four tasks to record your participation. Tasks do not guarantee a win.</p></div>
        <div className="flex items-center gap-2"><span className="text-[9px] text-muted-foreground">{count} of 4 completed</span><span className="rounded-full bg-surface-subtle px-2 py-1 text-[8px] font-medium">{Math.round((count / 4) * 100)}%</span></div>
      </div>
      <div className="p-4">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-[#16794A] transition-[width] duration-500" style={{ width: `${(count / 4) * 100}%` }} /></div>
        <div className="grid gap-2.5 lg:grid-cols-2">{TASKS.map((task) => <TaskCard key={task.key} task={task} giveawayId={giveawayId} postUrl={postUrl} completed={done.has(task.key)} onCompleted={(key) => setDone((current) => new Set(current).add(key))} />)}</div>
        {count === 4 ? <div className="mt-3 rounded-[9px] border border-[#3FBF7F]/25 bg-[#F3FBF6] p-3 text-center"><p className="text-[11px] font-semibold text-[#16794A]">You&apos;re all set! 🎉</p><p className="mt-1 text-[8.5px] text-muted-foreground">You&apos;ve completed all giveaway tasks. Your participation has been recorded. This does not guarantee winning a giveaway.</p></div> : null}
      </div>
    </section>
  );
}
