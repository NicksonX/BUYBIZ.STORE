"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { updateProfileAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";

export function ProfileForm({
  username,
  displayName,
}: {
  username: string;
  displayName: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      ) : null}
      <Field
        label="Username"
        htmlFor="profile-username"
        hint="Unique, case-insensitive"
        error={state.fieldErrors?.username}
      >
        <Input
          id="profile-username"
          name="username"
          defaultValue={username}
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]+"
          aria-invalid={Boolean(state.fieldErrors?.username)}
        />
      </Field>
      <Field
        label="Display name"
        htmlFor="profile-display-name"
        hint="Optional"
        error={state.fieldErrors?.displayName}
      >
        <Input
          id="profile-display-name"
          name="displayName"
          defaultValue={displayName ?? ""}
          maxLength={60}
          placeholder="How should we address you?"
        />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Save profile
      </button>
    </form>
  );
}
