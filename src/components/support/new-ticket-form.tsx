"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { createTicketAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";

export function NewTicketForm() {
  const [state, formAction, pending] = useActionState(
    createTicketAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.status === "error" ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      <Field label="Subject" htmlFor="subject" error={state.fieldErrors?.subject}>
        <Input
          id="subject"
          name="subject"
          placeholder="Briefly describe the issue"
          required
          minLength={5}
          maxLength={120}
          aria-invalid={Boolean(state.fieldErrors?.subject)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" error={state.fieldErrors?.category}>
          <Select id="category" name="category" defaultValue="general">
            <option value="general">General</option>
            <option value="proxy">Proxy access</option>
            <option value="wallet">Wallet</option>
            <option value="deposit">Deposit</option>
            <option value="technical">Technical</option>
          </Select>
        </Field>
        <Field label="Priority" htmlFor="priority" error={state.fieldErrors?.priority}>
          <Select id="priority" name="priority" defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
      </div>
      <Field label="Message" htmlFor="message" error={state.fieldErrors?.message}>
        <Textarea
          id="message"
          name="message"
          placeholder="Include the order number, exact error, and what you have already tried."
          required
          minLength={10}
          maxLength={5000}
          className="min-h-40"
          aria-invalid={Boolean(state.fieldErrors?.message)}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] leading-4 text-muted-foreground">
          Do not include passwords, API keys or full card numbers.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[11.5px] font-semibold text-background disabled:opacity-50"
        >
          {pending ? (
            <>
              <LoadingDots /> Opening…
            </>
          ) : (
            <>
              Open ticket <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
