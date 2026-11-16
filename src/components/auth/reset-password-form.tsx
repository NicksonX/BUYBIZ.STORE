"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { resetPasswordAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ResetPasswordForm({
  token,
  canReset,
}: {
  token?: string;
  canReset: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <div>
        <Alert tone="success" title="Password updated">
          {state.message}
        </Alert>
        <Link
          href="/login"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white hover:bg-[#1A1C1F]"
        >
          Sign in with your new password <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-medium text-[#0A0B0D]/45">
          New password
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
          Choose a new password.
        </h1>
        <p className="mt-2 text-[12.5px] leading-5 text-[#0A0B0D]/50">
          Use at least 8 characters with a letter and a number.
        </p>
      </div>

      {!canReset ? (
        <Alert tone="warning" title="This reset link cannot be used">
          The link may be missing, expired or already used. Request a new
          password reset link from the sign-in page.
        </Alert>
      ) : (
        <>
          {state.message && state.status === "error" ? (
            <Alert tone="danger" className="mb-5">
              {state.message}
            </Alert>
          ) : null}
          <form action={formAction} className="space-y-4">
            {token ? <input type="hidden" name="token" value={token} /> : null}
            <Field
              label="New password"
              htmlFor="password"
              hint="8+ characters"
              error={state.fieldErrors?.password}
            >
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="New password"
                required
                minLength={8}
                aria-invalid={Boolean(state.fieldErrors?.password)}
              />
            </Field>
            <Field
              label="Confirm new password"
              htmlFor="confirmPassword"
              error={state.fieldErrors?.confirmPassword}
            >
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Repeat new password"
                required
                minLength={8}
                aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
              />
            </Field>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1A1C1F] disabled:opacity-55"
            >
              {pending ? (
                <>
                  <LoadingDots /> Updating…
                </>
              ) : (
                <>
                  Update password <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </>
      )}

      <p className="mt-5 text-center text-[11px] text-[#0A0B0D]/40">
        <Link href="/forgot-password" className="font-medium text-[#0A0B0D]/65 hover:underline">
          Request another reset link
        </Link>
      </p>
    </div>
  );
}
