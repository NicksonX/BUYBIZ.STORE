"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { changePasswordAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-3.5">
      {state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      ) : null}
      <Field
        label="Current password"
        htmlFor="currentPassword"
        error={state.fieldErrors?.currentPassword}
      >
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
        />
      </Field>
      <Field
        label="New password"
        htmlFor="newPassword"
        hint="8+ characters, letter & number"
        error={state.fieldErrors?.newPassword}
      >
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.newPassword)}
        />
      </Field>
      <Field
        label="Confirm new password"
        htmlFor="confirmNewPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <PasswordInput
          id="confirmNewPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[10.5px] font-semibold hover:bg-accent disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <KeyRound className="h-3.5 w-3.5" />
        )}
        Update password
      </button>
    </form>
  );
}
