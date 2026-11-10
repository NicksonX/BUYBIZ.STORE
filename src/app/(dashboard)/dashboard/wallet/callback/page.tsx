import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FlaskConical,
  XCircle,
} from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { verifyAndCreditDeposit } from "@/server/services/deposits";
import { getWalletSummary } from "@/server/data/customer";
import { isDemoMode } from "@/lib/config";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { depositStatusMeta } from "@/lib/status";
import { AppError } from "@/lib/errors";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WalletCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const reference = first(params.reference) || first(params.trxref);

  if (!reference) {
    return (
      <div className="mx-auto max-w-lg">
        <Alert tone="warning" title="Missing payment reference">
          This callback URL did not include a payment reference. Open your wallet
          to check the deposit history.
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

  let result: Awaited<ReturnType<typeof verifyAndCreditDeposit>> | null = null;
  let errorMessage: string | null = null;
  try {
    result = await verifyAndCreditDeposit({
      reference,
      userId: user.id,
      actorUserId: user.id,
    });
  } catch (error) {
    errorMessage =
      error instanceof AppError
        ? error.userMessage
        : "We could not verify this payment. Your wallet has not been credited by this page.";
    console.error("[buybiz/wallet/callback] verification error", (error as Error).message);
  }

  const wallet = await getWalletSummary(user.id);
  const deposit = result?.deposit;
  const status = result?.status ?? "pending";
  const meta = depositStatusMeta(status);
  const credited = status === "credited";
  const pending = !credited && !["failed", "abandoned", "reversed"].includes(status);

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="surface-card overflow-hidden rounded-[18px]">
        <div className="border-b border-border bg-surface-subtle/70 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0A0B0D] text-white">
                <svg viewBox="0 0 40 40" className="h-4 w-4" fill="currentColor" fillRule="evenodd">
                  <path d="M12 7h12.6L34 16l-6.2 4 6.2 4-9.4 9H12V7Zm5 5v5h8l4-3.6L25 12h-8Zm0 12v6h9l4-3.6L25 24h-8Z" />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold">Wallet deposit</p>
                <p className="text-[8.5px] text-muted-foreground">
                  Reference {reference}
                </p>
              </div>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        </div>

        <div className="p-5 text-center sm:p-7">
          <span
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${
              credited
                ? "border-success/25 bg-success-soft text-success"
                : pending
                  ? "border-warning/25 bg-warning-soft text-warning"
                  : "border-danger/20 bg-danger-soft text-danger"
            }`}
          >
            {credited ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : pending ? (
              <Clock3 className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
          </span>

          <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">
            {credited
              ? "Wallet credited."
              : pending
                ? "Payment is still confirming."
                : "Payment was not completed."}
          </h1>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[11px] leading-5 text-muted-foreground">
            {errorMessage ??
              result?.message ??
              "Check your wallet and deposit history."}
          </p>

          {deposit ? (
            <div className="mt-5 rounded-[10px] border border-border bg-surface-subtle p-4 text-left">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Amount</span>
                <span className="tabular font-semibold">
                  {formatNaira(deposit.amountMinor, { exact: true })}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Status</span>
                <span>{meta.label}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Provider</span>
                <span className="flex items-center gap-1.5">
                  {deposit.provider === "demo" ? (
                    <>
                      <FlaskConical className="h-3 w-3" /> Demo (simulated)
                    </>
                  ) : (
                    "Paystack"
                  )}
                </span>
              </div>
              {deposit.creditedAt ? (
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Credited</span>
                  <span>{formatDateTime(deposit.creditedAt)}</span>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10px]">
                <span className="text-muted-foreground">Wallet balance</span>
                <span className="tabular font-semibold">
                  {formatNaira(wallet.balanceMinor, { exact: true })}
                </span>
              </div>
            </div>
          ) : null}

          {pending ? (
            <div className="mt-3 rounded-[9px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] leading-4 text-warning">
              This page only displays the server-verified state. Refreshing is
              safe. Wallet credit is idempotent and can only happen once.
            </div>
          ) : null}

          {isDemoMode() && credited && deposit?.provider === "demo" ? (
            <div className="mt-3 rounded-[9px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] leading-4 text-warning">
              This was a simulated demo deposit. No real money moved.
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard/wallet"
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-[11px] font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet
            </Link>
            <Link
              href="/dashboard/marketplace"
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground text-[11px] font-semibold text-background hover:opacity-90"
            >
              Buy a proxy <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
