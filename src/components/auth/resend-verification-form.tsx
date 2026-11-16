"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { resendVerificationAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ResendVerificationForm({
  email,
  demoMode,
}: {
  email?: string;
  demoMode: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resendVerificationAction,
    initialActionState,
  );

  return (
    <div className="space-y-3">
      {state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      ) : null}
      {demoMode ? (
        <p className="rounded-[8px] border border-black/[0.06] bg-white/60 px-3 py-2 text-[10px] leading-4 text-[#0A0B0D]/45">
          Demo mode does not send email. Use the verification button on this page
          to mark the account verified.
        </p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="email" value={email ?? ""} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-black/[0.09] bg-white px-3.5 text-[11px] font-medium text-[#0A0B0D] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            {pending ? (
              <LoadingDots />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Resend verification email
          </button>
        </form>
      )}
    </div>
  );
}
