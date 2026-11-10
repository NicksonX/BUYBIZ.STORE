"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { onboardingAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";

export function OnboardingForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(
    onboardingAction,
    initialActionState,
  );

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-medium text-[#0A0B0D]/45">
          One last step
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
          Choose your username.
        </h1>
        <p className="mt-2 text-[12.5px] leading-5 text-[#0A0B0D]/50">
          Your provider did not supply a BUYBIZ username. Pick a unique one before
          entering the dashboard.
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
          label="Username"
          htmlFor="username"
          hint="3 to 24 letters, numbers or _"
          error={state.fieldErrors?.username}
        >
          <Input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="e.g. zainab_b"
            required
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_]+"
            aria-invalid={Boolean(state.fieldErrors?.username)}
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1A1C1F] disabled:opacity-55"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              Enter BUYBIZ <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-[10px] leading-4 text-[#0A0B0D]/35">
        Usernames are unique and case-insensitive. You can change this later in
        Settings, subject to availability.
      </p>
    </div>
  );
}
