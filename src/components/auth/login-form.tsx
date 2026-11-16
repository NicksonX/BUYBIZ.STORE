"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialButtons } from "@/components/auth/social-buttons";
import { DemoAccountFill } from "@/components/auth/demo-account-fill";
import { LoadingDots } from "@/components/ui/loading-dots";

export function LoginForm({
  next,
  initialMessage,
  googleEnabled,
  demoMode,
}: {
  next?: string;
  initialMessage?: string;
  googleEnabled: boolean;
  demoMode: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState(loginAction, {
    ...initialActionState,
    ...(initialMessage
      ? { status: "error" as const, message: initialMessage }
      : {}),
  });

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-medium text-[#0A0B0D]/45">
          Welcome back
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
          Sign in to BUYBIZ.
        </h1>
        <p className="mt-2 text-[12.5px] leading-5 text-[#0A0B0D]/50">
          Pick up where you left off with your wallet, proxies and orders.
        </p>
      </div>

      {state.message && state.status === "error" ? (
        <Alert tone="danger" className="mb-5">
          {state.message}
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={state.fieldErrors?.password}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[11px] font-medium text-[#0A0B0D]/60 underline-offset-2 hover:text-[#0A0B0D] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-colors hover:bg-[#1A1C1F] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? (
            <>
              <LoadingDots /> Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <SocialButtons
        next={next}
        googleEnabled={googleEnabled}
        className="mt-6"
      />

      {demoMode ? <DemoAccountFill /> : null}

      <p className="mt-6 text-center text-[11.5px] text-[#0A0B0D]/45">
        New to BUYBIZ?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-medium text-[#0A0B0D] underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <p className="mt-5 text-center text-[10.5px] leading-4 text-[#0A0B0D]/45">
        By continuing you agree to the draft{" "}
        <Link href="/terms" className="underline hover:text-[#0A0B0D]/70">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-[#0A0B0D]/70">
          Privacy Notice
        </Link>
        .
      </p>
    </div>
  );
}
