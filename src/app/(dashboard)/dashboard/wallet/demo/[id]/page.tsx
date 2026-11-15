import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { getDepositById } from "@/server/services/deposits";
import {
  cancelDemoDepositAction,
  completeDemoDepositAction,
} from "@/server/actions/customer";
import { isDemoMode } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DemoCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserPage();
  if (!isDemoMode()) redirect("/dashboard/wallet");
  const deposit = await getDepositById(id);
  if (!deposit || deposit.userId !== user.id || deposit.provider !== "demo") {
    notFound();
  }
  if (deposit.status === "credited") {
    redirect(
      `/dashboard/wallet/callback?reference=${encodeURIComponent(
        deposit.providerReference,
      )}`,
    );
  }
  if (deposit.status === "failed" || deposit.status === "abandoned") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert tone="warning" title="This demo deposit is no longer active">
          It has status <strong>{deposit.status}</strong>. Start a new demo
          deposit from your wallet.
        </Alert>
        <Link
          href="/dashboard/wallet"
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[11px] font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="flex flex-col items-center">
        <div className="flex w-full flex-wrap items-center gap-2 rounded-[10px] border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[10px] leading-4 text-warning">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>
            <strong className="font-semibold">Demo payment simulator.</strong>{" "}
            This is a demo checkout. No card is charged and no real money moves.
            It exists only to exercise the wallet-credit and webhook logic
            locally.
          </span>
        </div>

        <div className="mt-6 w-full max-w-[460px] overflow-hidden rounded-[18px] border border-border bg-surface shadow-float">
          <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#0A0B0D] text-white">
                <svg viewBox="0 0 40 40" className="h-4 w-4" fill="currentColor" fillRule="evenodd">
                  <path d="M12 7h12.6L34 16l-6.2 4 6.2 4-9.4 9H12V7Zm5 5v5h8l4-3.6L25 12h-8Zm0 12v6h9l4-3.6L25 24h-8Z" />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold">BUYBIZ</p>
                <p className="text-[8.5px] text-muted-foreground">Demo checkout</p>
              </div>
            </div>
            <Badge tone="warning">Unsecured demo</Badge>
          </div>

          <div className="p-5 text-center">
            <p className="text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Amount to pay
            </p>
            <p className="tabular mt-2 text-[36px] font-semibold leading-none tracking-[-0.05em]">
              {formatNaira(deposit.amountMinor, { exact: true })}
            </p>
            <p className="mt-1.5 text-[9.5px] text-muted-foreground">
              {user.email}
            </p>

            <div className="mt-5 rounded-[10px] border border-border bg-surface-subtle p-3 text-left">
              <div className="flex items-center justify-between text-[9.5px]">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-[9px]">{deposit.providerReference}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9.5px]">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(deposit.createdAt)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9.5px]">
                <span className="text-muted-foreground">Payment method</span>
                <span>Demo card · no charge</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9.5px]">
                <span className="text-muted-foreground">Provider</span>
                <span className="uppercase">demo</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <form action={completeDemoDepositAction}>
                <input type="hidden" name="depositId" value={deposit.id} />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12px] font-semibold text-white hover:bg-[#1A1C1F]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete demo payment
                </button>
              </form>
              <form action={cancelDemoDepositAction}>
                <input type="hidden" name="depositId" value={deposit.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface text-[11px] font-medium text-muted-foreground hover:bg-accent"
                >
                  Cancel and return to wallet
                </button>
              </form>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1 text-[8.5px] text-muted-foreground">
              <LockKeyhole className="h-2.5 w-2.5" />
              Credited only after the server transaction completes.
            </p>
          </div>
        </div>

        <div className="mt-5 flex max-w-[460px] items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <p>
            In production this page does not exist. BUYBIZ uses a secure hosted
            checkout and verifies the transaction server-side before any wallet
            credit. The browser callback alone never marks a payment
            successful.
          </p>
        </div>
      </div>
    </div>
  );
}
