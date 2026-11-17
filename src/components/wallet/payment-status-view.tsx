import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  RefreshCw,
  ShieldAlert,
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
import { PaymentVisual, type PaymentVisualState } from "@/components/wallet/payment-loader";

export async function PaymentStatusView({ reference }: { reference?: string }) {
  const user = await requireUserPage();

  if (!reference) {
    return (
      <div className="mx-auto max-w-[560px]">
        <Alert tone="warning" title="Payment reference missing">
          This page needs the reference from your payment. Open your wallet to
          see your transaction history.
        </Alert>
        <Link
          href="/dashboard/wallet"
          className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[11.5px] font-medium"
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
        : "We could not verify this payment right now. Your wallet has not been credited by this page.";
    console.error(
      "[buybiz/wallet/status] verification error",
      (error as Error).message,
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-[560px]">
        <div className="surface-card rounded-[18px] p-5 text-center sm:p-7">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-warning/25 bg-warning-soft text-warning">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">
            We could not verify this payment.
          </h1>
          <p className="mx-auto mt-1.5 max-w-[390px] text-[11.5px] leading-5 text-muted-foreground">
            {errorMessage}
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/dashboard/wallet/payment/pending?reference=${encodeURIComponent(reference)}`}
              className="order-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[11.5px] font-semibold text-background transition-opacity hover:opacity-90 sm:order-2"
            >
              <RefreshCw className="h-4 w-4" /> Check again
            </Link>
            <Link
              href="/dashboard/wallet"
              className="order-2 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-[11.5px] font-medium transition-colors hover:bg-accent sm:order-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back to wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const wallet = await getWalletSummary(user.id);
  const deposit = result.deposit;
  const meta = depositStatusMeta(result.status);
  const credited = result.status === "credited";
  const pending =
    !credited &&
    !["failed", "abandoned", "reversed"].includes(result.status);
  const state = credited ? "success" : pending ? "pending" : "failed";
  const refreshHref = `/dashboard/wallet/payment/${state}?reference=${encodeURIComponent(reference)}`;

  return (
    <div className="mx-auto max-w-[600px]">
      <div className="surface-card overflow-hidden rounded-[18px]">
        <div className="border-b border-border bg-surface-subtle/70 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0A0B0D] text-white">
                <svg viewBox="0 0 40 40" className="h-4 w-4" fill="currentColor" fillRule="evenodd">
                  <path d="M12 7h12.6L34 16l-6.2 4 6.2 4-9.4 9H12V7Zm5 5v5h8l4-3.6L25 12h-8Zm0 12v6h9l4-3.6L25 24h-8Z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold">Wallet deposit</p>
                <p className="truncate font-mono text-[8.5px] text-muted-foreground">
                  {reference}
                </p>
              </div>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        </div>

        <div className="p-5 text-center sm:p-7">
          <PaymentVisual state={(credited ? "success" : pending ? "processing" : "failed") as PaymentVisualState} label={credited ? "Payment successful" : pending ? "Payment pending" : "Payment failed"} />

          <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.035em]">
            {credited
              ? "Payment successful."
              : pending
                ? "Payment is still pending."
                : "Payment failed."}
          </h1>
          <p className="mx-auto mt-1.5 max-w-[400px] text-[11.5px] leading-5 text-muted-foreground">
            {credited
              ? "Your payment was confirmed securely and your wallet has been credited. The credit can only happen once."
              : pending
                ? "Your payment has not been confirmed yet. Do not treat it as successful, and do not pay twice. You can check the status again."
                : "This payment was not completed. Your wallet was not credited. You can start a new deposit from your wallet."}
          </p>

          {deposit ? (
            <div className="mt-5 rounded-[11px] border border-border bg-surface-subtle p-4 text-left">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Amount</span>
                <span className="tabular font-semibold">
                  {formatNaira(deposit.amountMinor, { exact: true })}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{meta.label}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Payment</span>
                <span className="flex items-center gap-1.5">
                  {deposit.provider === "demo" ? (
                    <>
                      <FlaskConical className="h-3 w-3" /> Demo (simulated)
                    </>
                  ) : (
                    "Secure payment"
                  )}
                </span>
              </div>
              {deposit.creditedAt ? (
                <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
                  <span className="text-muted-foreground">Credited</span>
                  <span>{formatDateTime(deposit.creditedAt)}</span>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10.5px]">
                <span className="text-muted-foreground">Wallet balance</span>
                <span className="tabular font-semibold">
                  {formatNaira(wallet.balanceMinor, { exact: true })}
                </span>
              </div>
            </div>
          ) : null}

          {isDemoMode() && credited && deposit?.provider === "demo" ? (
            <div className="mt-3 rounded-[9px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] leading-4 text-warning">
              This was a simulated demo deposit. No real money moved.
            </div>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {pending ? (
              <Link
                href={refreshHref}
                className="order-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[11.5px] font-semibold text-background transition-opacity hover:opacity-90 sm:order-2"
              >
                <RefreshCw className="h-4 w-4" /> Check status
              </Link>
            ) : credited ? (
              <Link
                href="/dashboard/marketplace"
                className="order-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[11.5px] font-semibold text-background transition-opacity hover:opacity-90 sm:order-2"
              >
                Buy a proxy <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard/wallet"
                className="order-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[11.5px] font-semibold text-background transition-opacity hover:opacity-90 sm:order-2"
              >
                Try again <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/dashboard/wallet"
              className="order-2 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-[11.5px] font-medium transition-colors hover:bg-accent sm:order-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back to wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
