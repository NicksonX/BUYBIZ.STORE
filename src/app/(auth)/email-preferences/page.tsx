import Link from "next/link";
import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getEmailPreferenceByToken } from "@/server/data/email";
import { getEmailPreferences } from "@/server/services/email";
import { EmailPreferencesForm } from "@/components/email/email-preferences-form";

export const metadata: Metadata = { title: "Email preferences" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = first(params.token);
  const publicPrefs = token ? await getEmailPreferenceByToken(token) : null;
  const user = await getCurrentUser();
  const userPrefs = user ? await getEmailPreferences(user.id) : null;
  const email = publicPrefs?.email ?? user?.email ?? "";
  const marketingOptIn = publicPrefs?.marketingOptIn ?? userPrefs?.marketingOptIn ?? false;
  const depositRemindersOptIn =
    publicPrefs?.depositRemindersOptIn ?? userPrefs?.depositRemindersOptIn ?? true;

  return (
    <div>
      <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-black/[0.07] bg-white text-[#0A0B0D] shadow-xs">
        <Mail className="h-5 w-5" />
      </span>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A0B0D]/35">Email preferences</p>
      <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
        Choose what lands in your inbox.
      </h1>
      <p className="mt-3 text-[12px] leading-6 text-[#0A0B0D]/50">
        Essential BUYBIZ account emails are separate from optional marketing.
        You can change your mind at any time.
      </p>
      <div className="mt-5 rounded-[14px] border border-black/[0.08] bg-white p-4">
        {email ? (
          <EmailPreferencesForm
            email={email}
            marketingOptIn={marketingOptIn}
            depositRemindersOptIn={depositRemindersOptIn}
            token={token}
          />
        ) : (
          <div className="space-y-3 text-[11px] text-[#0A0B0D]/50">
            <p>Sign in to manage your email preferences, or use the link in a BUYBIZ email.</p>
            <Link href="/login?next=/email-preferences" className="inline-flex h-9 items-center rounded-full bg-[#0A0B0D] px-4 text-[10px] font-semibold text-white">Sign in</Link>
          </div>
        )}
      </div>
      <div className="mt-4 text-center">
        <Link href="/" className="text-[9.5px] text-[#0A0B0D]/40 underline underline-offset-2">Back to BUYBIZ</Link>
      </div>
    </div>
  );
}
