"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { signupAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialButtons } from "@/components/auth/social-buttons";

export function RegisterForm({
  next,
  referralCode,
  googleEnabled,
  demoMode,
}: {
  next?: string;
  referralCode?: string;
  googleEnabled: boolean;
  demoMode: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialActionState,
  );

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-medium text-[#0A0B0D]/45">
          Create your account
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
          Start with a wallet.
        </h1>
        <p className="mt-2 text-[12.5px] leading-5 text-[#0A0B0D]/50">
          One account for proxy plans, orders and support. No card is stored by
          BUYBIZ.
        </p>
      </div>

      {state.message && state.status === "error" ? (
        <Alert tone="danger" className="mb-5">
          {state.message}
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {referralCode ? (
          <>
            <input type="hidden" name="referralCode" value={referralCode} />
            <div className="rounded-[9px] border border-[#16794A]/15 bg-[#E7F6EE] px-3 py-2 text-[10.5px] leading-4 text-[#16794A]">
              Referral code <strong className="font-semibold">{referralCode}</strong> is applied. Reward rules apply.
            </div>
          </>
        ) : null}
        <Field
          label="Username"
          htmlFor="username"
          hint="3 to 24 letters, numbers or _"
          error={state.fieldErrors?.username}
        >
          <Input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="e.g. ademola_01"
            required
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_]+"
            aria-invalid={Boolean(state.fieldErrors?.username)}
          />
        </Field>

        <Field
          label="Email address"
          htmlFor="email"
          error={state.fieldErrors?.email}
        >
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

        <Field
          label="Password"
          htmlFor="password"
          hint="8+ characters, letter & number"
          error={state.fieldErrors?.password}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            required
            minLength={8}
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
        </Field>

        <div>
          <label className="flex items-start gap-2.5 text-[10.5px] leading-4 text-[#0A0B0D]/55">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="mt-0.5 h-3.5 w-3.5 rounded border-black/20 accent-[#0A0B0D]"
            />
            <span>
              I have read and accept the draft{" "}
              <Link href="/terms" className="font-medium text-[#0A0B0D] underline-offset-2 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-[#0A0B0D] underline-offset-2 hover:underline">
                Privacy Notice
              </Link>
              . I understand that BUYBIZ wallet credit is not cash-withdrawable.
            </span>
          </label>
          {state.fieldErrors?.acceptTerms ? (
            <p className="mt-1 text-[11px] font-medium text-[#B3261E]">
              {state.fieldErrors.acceptTerms}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-colors hover:bg-[#1A1C1F] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {demoMode ? (
        <p className="mt-3 rounded-[8px] border border-black/[0.06] bg-white/60 px-3 py-2 text-[9.5px] leading-4 text-[#0A0B0D]/40">
          Demo mode: no real verification email is sent. You will be able to
          verify the new email on the next screen to test the purchase gate.
        </p>
      ) : null}

      <SocialButtons
        next={next}
        googleEnabled={googleEnabled}
        className="mt-6"
      />

      <p className="mt-6 text-center text-[11.5px] text-[#0A0B0D]/45">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-[#0A0B0D] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
