import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Info,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { AddFundsForm } from "@/components/dashboard/add-funds-form";
import { requireUserPage } from "@/server/auth/guards";
import { getDepositsForUser, getWalletSummary } from "@/server/data/customer";
import { getAppSettings } from "@/server/data/settings";
import { isDemoMode, isPaystackConfigured } from "@/lib/config";
import { depositStatusMeta } from "@/lib/status";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="Your wallet."
        description="Spend it on BUYBIZ services. It is not a bank account, and there is no cash withdrawal."
        actions={
          <Link
            href="/dashboard/transactions"
            className="tap-target hidden h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[12px] font-medium hover:bg-accent sm:inline-flex sm:h-9 sm:px-3.5 sm:text-[11px]"
          >
            Full ledger <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {settings.maintenanceMode ? (
        <Alert tone="warning" title="Deposits are paused" className="mt-4">
          The platform is in maintenance mode. Existing wallet balances and
          proxy access are unaffected.
        </Alert>
      ) : null}

      <div className="mt-5 grid items-start gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[18px] border border-[#22252a] bg-[#0A0B0D] p-4 text-white shadow-[0_40px_80px_-50px_rgba(0,0,0,0.9)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_85%_-10%,rgba(255,255,255,0.16),transparent_52%)]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-white/[0.06]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.06]">
                  <Wallet className="h-4 w-4 text-white/70" />
                </span>
                <div>
                  <p className="text-[10px] font-medium text-white/40">
                    Available balance
                  </p>
                  <p className="mt-0.5 text-[9px] text-white/25">
                    BUYBIZ internal credit
                  </p>
                </div>
              </div>
              <Badge tone="onDark">NGN</Badge>
            </div>
            <p className="tabular mt-5 text-[31px] font-semibold leading-none tracking-[-0.055em] sm:mt-6 sm:text-[40px]">
              {formatNaira(wallet.balanceMinor, { exact: true })}
            </p>
            <p className="mt-2 text-[10px] text-white/35">
              Available to spend on BUYBIZ. No cash withdrawal.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
              <a
                href="#add-funds"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white text-[11.5px] font-semibold text-[#0A0B0D]"
              >
                Add money
              </a>
              <Link
                href="/dashboard/transactions"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[11.5px] font-medium text-white/75"
              >
                History
              </Link>
            </div>

            <div className="mt-6 hidden grid-cols-3 gap-3 border-t border-white/[0.08] pt-4 sm:grid">
              <div>
                <p className="text-[9.5px] text-white/35">
                  Deposited
                </p>
                <p className="tabular mt-1.5 text-[12px] font-medium">
                  {formatNaira(wallet.totalDepositedMinor, { exact: true })}
                </p>
              </div>
              <div>
                <p className="text-[9.5px] text-white/35">
                  Net spend
                </p>
                <p className="tabular mt-1.5 text-[12px] font-medium">
                  {formatNaira(
                    Math.max(0, wallet.totalSpentMinor - wallet.totalRefundedMinor),
                    { exact: true },
                  )}
                </p>
              </div>
              <div>
                <p className="text-[9.5px] text-white/35">
                  Refunded
                </p>
                <p className="tabular mt-1.5 text-[12px] font-medium text-[#8EE7B8]">
                  {formatNaira(wallet.totalRefundedMinor, { exact: true })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between px-1 text-[9px] text-muted-foreground sm:hidden">
          <span>Deposited <strong className="font-medium text-foreground">{formatNaira(wallet.totalDepositedMinor)}</strong></span>
          <span>Spent <strong className="font-medium text-foreground">{formatNaira(Math.max(0, wallet.totalSpentMinor - wallet.totalRefundedMinor))}</strong></span>
          <span>Refunded <strong className="font-medium text-[#16794A]">{formatNaira(wallet.totalRefundedMinor)}</strong></span>
        </div>

        <section id="add-funds" className="surface-card scroll-mt-24 rounded-[16px] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Add funds</h2>
            <span className="flex items-center gap-1 text-[8.5px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Verified server-side
            </span>
          </div>
          <div className="mt-4">
            <AddFundsForm
              minMinor={settings.depositMinMinor}
              maxMinor={settings.depositMaxMinor}
              demoMode={demo}
              paymentsEnabled={paymentsEnabled}
              channels={settings.paystackChannels}
            />
          </div>
        </section>
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

      <div className="mt-5 grid items-start gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-card overflow-hidden rounded-[15px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold">Deposit history</h2>
              <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                Paystack verifies payments server-side before credit.
              </p>
            </div>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </div>
          {deposits.length > 0 ? (
            <div className="divide-y divide-border">
              {deposits.map((deposit) => {
                const meta = depositStatusMeta(deposit.status);
                return (
                  <div
                    key={deposit.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle">
                        <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[10.5px] font-medium">
                          {deposit.provider === "demo" ? "Demo top-up" : "Paystack deposit"}
                          {deposit.provider === "demo" ? (
                            <Badge tone="warning" className="px-1.5 py-0 text-[8px]">
                              Simulated
                            </Badge>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[8.5px] text-muted-foreground">
                          {deposit.providerReference}
                        </p>
                        <p className="mt-0.5 text-[8.5px] text-muted-foreground">
                          {formatDateTime(deposit.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="tabular text-[11px] font-semibold">
                          {formatNaira(deposit.amountMinor, { exact: true })}
                        </p>
                        <div className="mt-1 flex justify-end">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </div>
                      </div>
                      {deposit.provider === "demo" && deposit.status === "pending" ? (
                        <Link
                          href={`/dashboard/wallet/demo/${deposit.id}`}
                          className="text-[9px] font-medium underline underline-offset-2"
                        >
                          Complete
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                compact
                icon={ReceiptText}
                title="No deposits yet"
                description="Add funds to start buying proxy plans with your wallet."
              />
            </div>
          )}
        </section>

        <div className="lg:hidden">
          <p className="text-[10px] leading-4 text-muted-foreground">
            {demo
              ? "Demo data: deposits are simulated and labelled. No real money is involved."
              : "Deposits are credited only after server-side payment verification."}{" "}
            <Link href="/faq" className="underline underline-offset-2">
              Read the deposit FAQ
            </Link>
            .
          </p>
        </div>

        <div className="hidden space-y-3 lg:block">
          <section className="rounded-[14px] border border-border bg-surface-subtle p-4">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Info className="h-3.5 w-3.5" /> How deposits work
            </h2>
            <p className="mt-2 text-[9.5px] leading-4 text-muted-foreground">
              Your wallet is credited once the payment is verified on our server.
              Duplicate callbacks cannot credit twice. Read the{" "}
              <Link href="/faq" className="underline underline-offset-2">FAQ</Link>{" "}
              or{" "}
              <Link href="/terms#wallet" className="underline underline-offset-2">Terms</Link>{" "}
              for the full policy.
            </p>
            <p className="mt-2 text-[9px] text-warning">No cash withdrawal is available.</p>
          </section>

          <section className="rounded-[14px] border border-border bg-surface p-4">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Clock3 className="h-3.5 w-3.5" /> Payment states
            </h2>
            <p className="mt-2 text-[9.5px] leading-4 text-muted-foreground">
              A successful charge shows as credited only after it is verified and
              matched to your pending deposit. Gateway status and wallet ledger
              status are kept separate.
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
