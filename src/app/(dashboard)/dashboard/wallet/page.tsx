import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Info,
  LifeBuoy,
  Network,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { FundWalletButton } from "@/components/dashboard/fund-wallet-dialog";
import { WalletBalanceAmount } from "@/components/wallet/balance-amount";
import { requireUserPage } from "@/server/auth/guards";
import { getDepositsForUser, getWalletSummary } from "@/server/data/customer";
import { getAppSettings } from "@/server/data/settings";
import { getPaystackMode, isDemoMode, isPaystackConfigured } from "@/lib/config";
import { depositStatusMeta } from "@/lib/status";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";
import type { Deposit } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function depositHref(deposit: Deposit) {
  if (deposit.provider === "demo" && deposit.status === "pending") {
    return `/dashboard/wallet/demo/${deposit.id}`;
  }
  const state =
    deposit.status === "credited" || deposit.status === "successful"
      ? "success"
      : ["failed", "abandoned", "reversed"].includes(deposit.status)
        ? "failed"
        : "pending";
  return `/dashboard/wallet/payment/${state}?reference=${encodeURIComponent(deposit.providerReference)}`;
}

function quickActionClass() {
  return "flex min-h-[84px] flex-col items-start justify-between rounded-[11px] border border-border bg-surface-subtle p-3 text-left transition-colors hover:border-border-strong hover:bg-accent";
}

export default async function WalletPage() {
  const user = await requireUserPage();
  const [wallet, deposits, settings] = await Promise.all([
    getWalletSummary(user.id),
    getDepositsForUser(user.id),
    getAppSettings(),
  ]);
  const demo = isDemoMode();
  const paymentsEnabled = isPaystackConfigured() || demo;
  const pendingDemo = deposits.find(
    (deposit) => deposit.provider === "demo" && deposit.status === "pending",
  );
  const funding = {
    minMinor: settings.depositMinMinor,
    maxMinor: settings.depositMaxMinor,
    demoMode: demo,
    paymentsEnabled,
    channels: settings.paystackChannels,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="Wallet"
        description="Manage your balance, funding and wallet activity."
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <FundWalletButton {...funding} />
            <Link
              href="/dashboard/transactions"
              className="tap-target inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[11px] font-medium hover:bg-accent"
            >
              Full ledger <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      {settings.maintenanceMode ? (
        <Alert tone="warning" title="Deposits are paused" className="mt-4">
          The platform is in maintenance mode. Existing wallet balances and proxy
          access are unaffected.
        </Alert>
      ) : null}

      <div className="mt-5 grid items-stretch gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="relative overflow-hidden rounded-[18px] border border-[#22252a] bg-[#0A0B0D] p-4 text-white shadow-[0_40px_80px_-50px_rgba(0,0,0,0.9)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_85%_-10%,rgba(255,255,255,0.16),transparent_52%)]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-white/[0.06]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.06]">
                  <Wallet className="h-4 w-4 text-white/70" />
                </span>
                <div>
                  <p className="text-[10px] font-medium text-white/45">
                    Available balance
                  </p>
                  <p className="mt-0.5 text-[9px] text-white/25">
                    BUYBIZ internal credit
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Badge tone="onDark">NGN</Badge>
                {!demo && getPaystackMode() === "test" ? (
                  <Badge tone="warning">Test funds</Badge>
                ) : null}
              </div>
            </div>

            <WalletBalanceAmount amountMinor={wallet.balanceMinor} />
            <p className="mt-2 text-[10px] text-white/35">
              Available to spend on BUYBIZ. No cash withdrawal.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
              <FundWalletButton {...funding} variant="light" className="w-full" />
              <Link
                href="/dashboard/transactions"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[11.5px] font-medium text-white/75"
              >
                History
              </Link>
            </div>

            <div className="mt-6 hidden grid-cols-3 gap-3 border-t border-white/[0.08] pt-4 sm:grid">
              <div>
                <p className="text-[9.5px] text-white/35">Deposited</p>
                <p className="tabular mt-1.5 text-[12px] font-medium">
                  {formatNaira(wallet.totalDepositedMinor, { exact: true })}
                </p>
              </div>
              <div>
                <p className="text-[9.5px] text-white/35">Net spend</p>
                <p className="tabular mt-1.5 text-[12px] font-medium">
                  {formatNaira(
                    Math.max(0, wallet.totalSpentMinor - wallet.totalRefundedMinor),
                    { exact: true },
                  )}
                </p>
              </div>
              <div>
                <p className="text-[9.5px] text-white/35">Refunded</p>
                <p className="tabular mt-1.5 text-[12px] font-medium text-[#8EE7B8]">
                  {formatNaira(wallet.totalRefundedMinor, { exact: true })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="surface-card hidden flex-col rounded-[18px] p-5 lg:flex">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Quick actions</h2>
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Wallet
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <FundWalletButton
              {...funding}
              variant="outline"
              className="!min-h-[84px] w-full flex-col !items-start !justify-between !rounded-[11px] !bg-surface-subtle !px-3 !text-[10px]"
            />
            <Link href="/dashboard/marketplace" className={quickActionClass()}>
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="mt-3 text-[10.5px] font-medium">Marketplace</span>
            </Link>
            <Link href="/dashboard/transactions" className={quickActionClass()}>
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
              <span className="mt-3 text-[10.5px] font-medium">Full ledger</span>
            </Link>
            <Link href="/dashboard/support" className={quickActionClass()}>
              <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              <span className="mt-3 text-[10.5px] font-medium">Support</span>
            </Link>
          </div>
          <div className="mt-auto pt-5">
            <p className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Deposits are verified on the server before your wallet is credited.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-muted-foreground sm:hidden">
        <span>
          Deposited{" "}
          <strong className="font-medium text-foreground">
            {formatNaira(wallet.totalDepositedMinor)}
          </strong>
        </span>
        <span>
          Spent{" "}
          <strong className="font-medium text-foreground">
            {formatNaira(Math.max(0, wallet.totalSpentMinor - wallet.totalRefundedMinor))}
          </strong>
        </span>
        <span>
          Refunded{" "}
          <strong className="font-medium text-[#16794A]">
            {formatNaira(wallet.totalRefundedMinor)}
          </strong>
        </span>
      </div>

      {pendingDemo ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[10px] text-warning">
          <span>
            A demo deposit of{" "}
            {formatNaira(pendingDemo.amountMinor, { exact: true })} is awaiting
            simulated payment.
          </span>
          <Link
            href={`/dashboard/wallet/demo/${pendingDemo.id}`}
            className="font-semibold underline underline-offset-2"
          >
            Complete demo payment
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid items-start gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="surface-card overflow-hidden rounded-[16px]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-[13px] font-semibold">Recent transactions</h2>
              <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                Verified wallet deposits and payment attempts.
              </p>
            </div>
            <Link
              href="/dashboard/transactions"
              className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {deposits.length > 0 ? (
            <>
              <div className="divide-y divide-border sm:hidden">
                {deposits.map((deposit) => {
                  const meta = depositStatusMeta(deposit.status);
                  const credited =
                    deposit.status === "credited" || deposit.status === "successful";
                  return (
                    <Link
                      key={deposit.id}
                      href={depositHref(deposit)}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle">
                        <ArrowDownLeft
                          className={cn(
                            "h-4 w-4",
                            credited ? "text-success" : "text-muted-foreground",
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold">
                              {deposit.provider === "demo"
                                ? "Demo top-up"
                                : "Wallet deposit"}
                            </p>
                            <p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">
                              {formatDateTime(deposit.createdAt)}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "tabular shrink-0 text-[12.5px] font-semibold",
                              credited ? "text-success" : "text-foreground",
                            )}
                          >
                            {credited ? "+" : ""}
                            {formatNaira(deposit.amountMinor, { exact: true })}
                          </p>
                        </div>
                        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                          <Badge tone={meta.tone} className="shrink-0">
                            {meta.label}
                          </Badge>
                          {deposit.provider === "demo" ? (
                            <span className="shrink-0 text-[8px] text-muted-foreground">
                              Simulated
                            </span>
                          ) : null}
                          <span className="min-w-0 truncate font-mono text-[8px] text-muted-foreground/70">
                            {deposit.providerReference}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    </Link>
                  );
                })}
              </div>

              <div className="hidden sm:block">
                <div className="grid grid-cols-[minmax(0,1fr)_130px_104px_20px] items-center gap-4 border-b border-border bg-surface-subtle/60 px-5 py-2.5 text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  <span>Transaction</span>
                  <span className="text-right">Amount</span>
                  <span>Status</span>
                  <span />
                </div>
                <div className="divide-y divide-border">
                  {deposits.map((deposit) => {
                    const meta = depositStatusMeta(deposit.status);
                    const credited =
                      deposit.status === "credited" || deposit.status === "successful";
                    return (
                      <Link
                        key={deposit.id}
                        href={depositHref(deposit)}
                        className="grid grid-cols-[minmax(0,1fr)_130px_104px_20px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle">
                            <ArrowDownLeft
                              className={cn(
                                "h-3.5 w-3.5",
                                credited ? "text-success" : "text-muted-foreground",
                              )}
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium">
                              {deposit.provider === "demo"
                                ? "Demo top-up"
                                : "Wallet deposit"}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                              {formatDateTime(deposit.createdAt)} ·{" "}
                              {deposit.providerReference}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "tabular text-right text-[11.5px] font-semibold",
                            credited ? "text-success" : "text-foreground",
                          )}
                        >
                          {credited ? "+" : ""}
                          {formatNaira(deposit.amountMinor, { exact: true })}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {deposit.provider === "demo" ? (
                            <span className="text-[8px] text-muted-foreground">
                              Demo
                            </span>
                          ) : null}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 sm:p-5">
              <EmptyState
                compact
                icon={ReceiptText}
                title="No wallet activity yet"
                description="Your deposits and wallet credits will appear here after your first verified payment."
                action={<FundWalletButton {...funding} variant="outline" />}
              />
            </div>
          )}
        </section>

        <div className="space-y-3">
          <section className="relative overflow-hidden rounded-[16px] border border-[#22252a] bg-[#0A0B0D] p-5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full border border-white/[0.08]" />
            <ShieldCheck className="h-5 w-5 text-white/55" />
            <h2 className="mt-4 text-[13px] font-semibold">
              Secure, verified deposits
            </h2>
            <p className="mt-1.5 text-[10px] leading-5 text-white/40">
              Paystack confirms every payment on our server before your wallet is
              credited. Duplicate callbacks cannot credit twice.
            </p>
            <Link
              href="/faq"
              className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-white/70 hover:text-white"
            >
              Read the deposit FAQ <ArrowUpRight className="h-3 w-3" />
            </Link>
          </section>

          <section className="rounded-[14px] border border-border bg-surface p-4">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Info className="h-3.5 w-3.5" /> Payment states
            </h2>
            <p className="mt-2 text-[9.5px] leading-4 text-muted-foreground">
              A successful charge shows as credited only after it is verified and
              matched to your pending deposit. Pending payments are not credit.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <Clock3 className="h-3 w-3" /> Pending can take a few moments to settle.
            </p>
            <p className="mt-2 text-[9px] text-warning">
              No cash withdrawal is available.
            </p>
          </section>

          {demo ? (
            <div className="rounded-[12px] border border-border bg-surface-subtle p-3.5 text-[9px] leading-4 text-muted-foreground">
              You are in demo mode. Deposits are simulated locally and labelled
              “Simulated” in this history. Production deployments route through
              Paystack's hosted checkout and are verified server-side.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
