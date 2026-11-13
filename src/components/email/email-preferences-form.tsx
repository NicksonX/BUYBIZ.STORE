"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";
import { updateEmailPreferenceAction } from "@/server/actions/email-preferences";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";

export function EmailPreferencesForm({
  email,
  marketingOptIn,
  depositRemindersOptIn,
  token,
}: {
  email: string;
  marketingOptIn: boolean;
  depositRemindersOptIn: boolean;
  token?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmailPreferenceAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-4">
      {token ? <input type="hidden" name="token" value={token} /> : null}
      {state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      ) : null}
      <div className="rounded-[10px] border border-border bg-surface-subtle p-3.5">
        <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">Email address</p>
        <p className="mt-1 break-all text-[11px] font-medium">{email}</p>
      </div>
      <label className="flex items-start gap-2.5 rounded-[10px] border border-border p-3.5 text-[10px] leading-5">
        <input type="checkbox" name="depositRemindersOptIn" defaultChecked={depositRemindersOptIn} className="mt-0.5 h-4 w-4 accent-foreground" />
        <span>
          <span className="block font-medium">Helpful deposit reminders</span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">
            Occasional onboarding reminders if you have not funded your wallet yet.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2.5 rounded-[10px] border border-border p-3.5 text-[10px] leading-5">
        <input type="checkbox" name="marketingOptIn" defaultChecked={marketingOptIn} className="mt-0.5 h-4 w-4 accent-foreground" />
        <span>
          <span className="block font-medium">BUYBIZ offers and occasional updates</span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">
            Optional promotional email. You will still receive essential messages about deposits, referrals, payouts and account security.
          </span>
        </span>
      </label>
      <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[10px] font-semibold text-background disabled:opacity-50">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
        Save preferences
      </button>
      <p className="text-[8.5px] leading-4 text-muted-foreground">
        Transactional emails such as OTP, deposit confirmations, referral rewards, ambassador commissions and payout updates cannot be unsubscribed while you have an active account.
      </p>
    </form>
  );
}
