"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { contactAction } from "@/server/actions/public";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    contactAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-[14px] border border-[#16794A]/20 bg-[#E7F6EE] p-6 text-center">
        <p className="text-[14px] font-semibold text-[#116B40]">Message received</p>
        <p className="mt-2 text-[11.5px] leading-5 text-[#116B40]/75">
          {state.message}
        </p>
        <p className="mt-3 text-[10px] leading-4 text-[#116B40]/60">
          For account-specific issues, signed-in customers can also open a
          support ticket from the dashboard.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.status === "error" ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="contact-name" error={state.fieldErrors?.name}>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
        </Field>
        <Field label="Email address" htmlFor="contact-email" error={state.fieldErrors?.email}>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
        </Field>
      </div>
      <Field label="Subject" htmlFor="contact-subject" error={state.fieldErrors?.subject}>
        <Input
          id="contact-subject"
          name="subject"
          required
          aria-invalid={Boolean(state.fieldErrors?.subject)}
        />
      </Field>
      <Field label="Message" htmlFor="contact-message" error={state.fieldErrors?.message}>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          maxLength={4000}
          className="min-h-36"
          aria-invalid={Boolean(state.fieldErrors?.message)}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] leading-4 text-[#0A0B0D]/40">
          Never include your password, card number or API keys.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#0A0B0D] px-5 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? (
            <LoadingDots />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          Send message
        </button>
      </div>
    </form>
  );
}
