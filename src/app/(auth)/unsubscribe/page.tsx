import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, MailX } from "lucide-react";
import { getEmailPreferenceByToken } from "@/server/data/email";
import { unsubscribeEmailAction } from "@/server/actions/email-preferences";

export const metadata: Metadata = { title: "Unsubscribe" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = first(params.token);
  const status = first(params.status);
  const prefs = token ? await getEmailPreferenceByToken(token) : null;
  return (
    <div>
      <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-black/[0.07] bg-white text-[#0A0B0D] shadow-xs">
        {status === "done" ? <CheckCircle2 className="h-5 w-5 text-[#16794A]" /> : <MailX className="h-5 w-5" />}
      </span>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A0B0D]/35">Marketing email</p>
      <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
        {status === "done" ? "You are unsubscribed." : "Leave the marketing list."}
      </h1>
      <p className="mt-3 text-[12px] leading-6 text-[#0A0B0D]/50">
        {status === "done"
          ? "You will no longer receive optional BUYBIZ marketing or deposit reminder emails. Essential account emails still arrive."
          : "This only stops optional marketing and deposit reminders. OTP, deposit confirmations, referrals, ambassador commissions and payout emails are essential and will still be sent."}
      </p>
      <div className="mt-5 rounded-[14px] border border-black/[0.08] bg-white p-4">
        {status === "done" ? (
          <Link href="/email-preferences" className="inline-flex h-9 items-center rounded-full border border-black/[0.09] px-4 text-[10px] font-medium">
            Manage email preferences
          </Link>
        ) : prefs && token ? (
          <form action={unsubscribeEmailAction}>
            <input type="hidden" name="token" value={token} />
            <p className="mb-3 text-[10px] text-[#0A0B0D]/50">{prefs.email}</p>
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0A0B0D] px-4 text-[11px] font-semibold text-white">
              <MailX className="h-3.5 w-3.5" /> Unsubscribe from marketing
            </button>
          </form>
        ) : (
          <p className="text-[10px] text-[#0A0B0D]/45">This unsubscribe link is invalid or has expired. You can sign in and update your preferences instead.</p>
        )}
      </div>
    </div>
  );
}
