"use client";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { rateSupportTicketAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/ui/loading-dots";

export function SupportRatingForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(rateSupportTicketAction, initialActionState);
  const [rating, setRating] = useState(0);
  return <section className="surface-card rounded-[14px] p-4"><h2 className="text-[12px] font-semibold">Rate this support experience</h2><p className="mt-1 text-[9px] text-muted-foreground">This ticket was closed after no further response. Your feedback helps us improve.</p><form action={action} className="mt-3 space-y-2"><input type="hidden" name="ticketId" value={ticketId} /><input type="hidden" name="rating" value={rating} /><div className="flex gap-1">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value===1?"":"s"}`} className={value <= rating ? "text-warning" : "text-muted-foreground"}><Star className="h-5 w-5" fill={value <= rating ? "currentColor" : "none"} /></button>)}</div><textarea name="feedback" maxLength={1000} placeholder="Optional feedback" className="min-h-16 w-full rounded-[8px] border border-border bg-surface px-2.5 py-2 text-[10px]" /><button type="submit" disabled={pending || rating < 1} className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-3 text-[9.5px] font-semibold text-background disabled:opacity-40">{pending ? <LoadingDots label="Saving rating" /> : null} Submit rating</button>{state.message ? <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert> : null}</form></section>;
}
