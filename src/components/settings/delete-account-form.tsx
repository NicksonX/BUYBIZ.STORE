"use client";
import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteAccountAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/ui/loading-dots";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, initialActionState);
  const [confirm, setConfirm] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  return (
    <section className="rounded-[14px] border border-danger/25 bg-danger-soft/50 p-5">
      <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-danger" /><div><h2 className="text-[12px] font-semibold text-danger">Delete account</h2><p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">This closes your account immediately and changes your profile identity. It cannot be undone from your dashboard. Financial, order, referral and audit records are retained where required; active proxy plans and wallet balances are not refunded automatically.</p></div></div>
      <form action={action} className="mt-3 space-y-2">
        <label className="flex items-start gap-2 text-[9px] leading-4"><input type="checkbox" name="acknowledge" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#B3261E]" /> I understand this warning and want to delete my account.</label>
        <label className="block text-[9px] text-muted-foreground" htmlFor="delete-confirm">Type DELETE to confirm</label>
        <input id="delete-confirm" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="h-9 w-full max-w-[240px] rounded-[8px] border border-danger/25 bg-surface px-2.5 text-[11px] outline-none focus:border-danger" />
        <button type="submit" disabled={pending || !acknowledge || confirm !== "DELETE"} className="inline-flex h-9 items-center rounded-full bg-danger px-3 text-[9.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{pending ? <LoadingDots label="Deleting account" /> : null} Delete my account</button>
        {state.message ? <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert> : null}
      </form>
    </section>
  );
}
