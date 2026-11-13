import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Snowflake, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getWalletSummary } from "@/server/data/customer";
import { getAppSettings } from "@/server/data/settings";
import { formatDateTime, formatNaira } from "@/lib/utils";
import { ReactivationForm } from "@/components/auth/reactivation-form";

export const metadata: Metadata = { title: "Reactivate your account" };
export const dynamic = "force-dynamic";

export default async function ReactivatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/reactivate");
  if (user.status !== "frozen") {
    redirect(user.role === "customer" ? "/dashboard" : "/admin");
  }
  const [wallet, settings] = await Promise.all([
    getWalletSummary(user.id),
    getAppSettings(),
  ]);
  const fee = settings.reactivationFeeMinor;

  return (
    <div>
      <div className="mb-6">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A0B0D]/35">
          <Snowflake className="h-3.5 w-3.5" /> Account frozen
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-[1.04] tracking-[-0.045em] text-[#0A0B0D] sm:text-[34px]">
          Your account is on hold.
        </h1>
        <p className="mt-2 text-[12px] leading-5 text-[#0A0B0D]/50">
          It was frozen after {settings.inactivityDays} days without qualifying
          activity. Your wallet credits and purchase history are still here.
        </p>
      </div>

      <div className="rounded-[14px] border border-black/[0.08] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[11px] font-medium">
            <Wallet className="h-4 w-4" /> Preserved wallet balance
          </span>
          <span className="tabular text-[16px] font-semibold">
            {formatNaira(wallet.balanceMinor, { exact: true })}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3 text-[10.5px]">
          <span className="text-[#0A0B0D]/45">Reactivation fee</span>
          <span className="tabular font-semibold">{formatNaira(fee, { exact: true })}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
          <span className="text-[#0A0B0D]/45">Frozen since</span>
          <span>{formatDateTime(user.frozenAt ?? user.lastActivityAt)}</span>
        </div>
        <p className="mt-3 rounded-[8px] bg-[#F7F7F8] px-3 py-2 text-[9px] leading-4 text-[#0A0B0D]/45">
          The fee is charged from your preserved BUYBIZ credits. Frozen accounts
          cannot buy proxies. Any proxy subscription that expires while frozen
          stays expired after reactivation and must be purchased again.
        </p>
      </div>

      <ReactivationForm
        feeMinor={fee}
        balanceMinor={wallet.balanceMinor}
        feeLabel={formatNaira(fee, { exact: true })}
      />

      <div className="mt-5 flex items-center justify-between gap-3 text-[9.5px] text-[#0A0B0D]/40">
        <Link href="/login" className="inline-flex items-center gap-1 underline underline-offset-2">
          <ArrowLeft className="h-3 w-3" /> Use another account
        </Link>
        <Link href="/contact" className="underline underline-offset-2">
          Contact support
        </Link>
      </div>
    </div>
  );
}
