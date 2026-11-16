"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ForgotPasswordForm({ demoMode }: { demoMode: boolean }) {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialActionState,
  );

  return (
    <div>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[#0A0B0D]/45 hover:text-[#0A0B0D]"
      >
        <ArrowLeft className="h-3 w-3" /> Back to sign in
      </Link>

      <div className="mb-7">
        <p className="text-[11px] font-medium text-[#0A0B0D]/45">
          Account recovery
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
          Reset your password.
        </h1>
        <p className="mt-2 text-[12.5px] leading-5 text-[#0A0B0D]/50">
          Enter the email on your BUYBIZ account. If it exists, we will send a
          reset link.
        </p>
      </div>

      {state.status === "success" ? (
        <div className="space-y-4">
          <Alert tone="success" title="Check your inbox">
            {state.message}
          </Alert>
          {demoMode && state.resetUrl ? (
            <div className="rounded-[10px] border border-black/[0.08] bg-white p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-[#0A0B0D]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16794A]" />
                Demo mode: use this link instead of an email
              </p>
              <Link
                href={state.resetUrl}
                className="mt-2 block break-all text-[10.5px] font-medium text-[#0A0B0D] underline underline-offset-2"
              >
                Open demo password reset
              </Link>
            </div>
          ) : null}
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] border border-black/[0.1] bg-white text-[12px] font-medium text-[#0A0B0D] hover:bg-[#FAFAFA]"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          {state.message && state.status === "error" ? (
            <Alert tone="danger">{state.message}</Alert>
          ) : null}
          <Field label="Email address" htmlFor="email" error={state.fieldErrors?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
          </Field>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1A1C1F] disabled:opacity-55"
          >
            {pending ? (
              <>
                <LoadingDots /> Sending…
              </>
            ) : (
              <>
                Send reset link <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
