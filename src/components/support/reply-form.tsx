"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { replyToTicketAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/input";

export function ReplyForm({
  ticketId,
  closed,
}: {
  ticketId: string;
  closed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    replyToTicketAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  if (closed) {
    return (
      <div className="rounded-[10px] border border-border bg-surface-subtle p-3 text-[10px] text-muted-foreground">
        This ticket is closed. Open a new ticket if you need more help.
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      ) : null}
      <Textarea
        name="message"
        required
        maxLength={5000}
        placeholder="Write a reply to the BUYBIZ support team…"
        className="min-h-24 text-[12px]"
        aria-label="Reply message"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send reply
        </button>
      </div>
    </form>
  );
}
