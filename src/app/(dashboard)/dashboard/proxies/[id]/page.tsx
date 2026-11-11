import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Info,
  LockKeyhole,
  Network,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Countdown } from "@/components/dashboard/countdown";
import { CredentialField } from "@/components/dashboard/credential-field";
import { requireUserPage } from "@/server/auth/guards";
import { getAllocationDetail } from "@/server/data/customer";
import { decryptOptional } from "@/lib/security/encryption";
import {
  cn,
  formatDateTime,
  formatDuration,
  formatNaira,
  formatRemaining,
} from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { AdminActionForm } from "@/components/admin/action-form";
import { renewProxyAction } from "@/server/actions/customer";

export const dynamic = "force-dynamic";

type EffectiveStatus = "active" | "expired" | "interrupted" | "revoked";

export default async function ProxyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUserPage();
  const allocation = await getAllocationDetail(user.id, id);
  if (!allocation) notFound();

  const isNew = query.new === "1";
  const renewalKey = randomUUID();
  const now = new Date();
  const packageActive =
    allocation.status === "active" &&
    new Date(allocation.expiresAt) > now &&
    new Date(allocation.inventoryExpiresAt) > now;
  const effective: EffectiveStatus =
    allocation.status === "interrupted"
      ? "interrupted"
      : allocation.status === "revoked"
        ? "revoked"
        : packageActive
          ? "active"
          : "expired";

  const username = packageActive
    ? await decryptOptional(allocation.encryptedUsername)
    : null;
  const password = packageActive
    ? await decryptOptional(allocation.encryptedPassword)
    : null;

  const statusTone = {
    active: "success",
    expired: "neutral",
    interrupted: "warning",
    revoked: "danger",
  } as const;

  const activated = new Date(allocation.activatedAt).getTime();
  const expires = new Date(allocation.expiresAt).getTime();
  const remainingPct = packageActive
    ? Math.max(0, Math.min(100, ((expires - Date.now()) / (expires - activated)) * 100))
    : 0;
  const renewalPriceMinor = Number(allocation.productPriceMinor ?? 0);
  const renewalExpiresAt = allocation.durationSeconds
    ? new Date(expires + Number(allocation.durationSeconds) * 1000)
    : null;

  return (
    <div>
      <PageHeader
        backHref="/dashboard/proxies"
        backLabel="Back to my proxies"
        eyebrow="Proxy allocation"
        title={allocation.productName}
        description={`Order ${allocation.orderNumber} · ${allocation.region ?? "Region not set"} · ${allocation.accessType === "single" ? "personal proxy" : "shared proxy"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone[effective]} className="capitalize">
              {effective}
            </Badge>
            <Link
              href="/dashboard/marketplace"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "h-8 rounded-full px-3",
              )}
            >
              {effective === "active" ? "Buy more" : "Buy again"}
            </Link>
          </div>
        }
      />

      {isNew ? (
        <Alert tone="success" title="Proxy allocated" className="mt-4">
          Your access window is active. Copy the connection details below before
          you leave this page. They remain available in My Proxies until expiry.
        </Alert>
      ) : null}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card overflow-hidden rounded-[16px]">
          <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface-subtle">
                <Network className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold">
                  {packageActive ? "Connection details" : "Connection details hidden"}
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {packageActive
                    ? "Use these upstream proxy settings in your client."
                    : "Credentials are no longer shown because this access window has ended."}
                </p>
              </div>
            </div>
            <Badge tone={packageActive ? "onDark" : "neutral"} className={packageActive ? "bg-foreground text-background" : ""}>
              {allocation.accessType === "single" ? (
                <UserRound className="h-3 w-3" />
              ) : (
                <Users className="h-3 w-3" />
              )}{" "}
              {allocation.accessType === "single" ? "Personal" : "Shared"}
            </Badge>
          </div>

          <div className="p-4 sm:p-5">
            {packageActive ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <CredentialField
                    label="Host / IP"
                    value={allocation.host}
                    hint="Upstream proxy host"
                  />
                  <CredentialField label="Port" value={String(allocation.port)} />
                  <CredentialField
                    label="Username"
                    value={username}
                    secret
                    hint={username ? "Masked by default" : "This provider uses no username."}
                  />
                  <CredentialField
                    label="Password"
                    value={password}
                    secret
                    hint={password ? "Masked by default" : "This provider uses no password."}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[9px] border border-border bg-surface-subtle px-3 py-2">
                    <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Protocol
                    </p>
                    <p className="mt-1 text-[11px] font-medium uppercase">
                      {allocation.protocol}
                    </p>
                  </div>
                  <div className="rounded-[9px] border border-border bg-surface-subtle px-3 py-2">
                    <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Region
                    </p>
                    <p className="mt-1 text-[11px] font-medium">
                      {allocation.region ?? "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[10px] border border-warning/25 bg-warning-soft p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-warning">
                    <ShieldAlert className="h-3.5 w-3.5" /> Shared proxy disclosure
                  </p>
                  <p className="mt-1.5 text-[9.5px] leading-4 text-warning/80">
                    {allocation.accessType === "single"
                      ? "This proxy is limited to one active customer. Do not share these details."
                      : "This proxy is shared with other active customers, who use the same credentials and IP. Shared credentials cannot be individually revoked at network level."}{" "}
                    <Link href="/terms#expiry" className="underline underline-offset-2">
                      Full details
                    </Link>
                    .
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-[12px] border border-dashed border-border-strong bg-surface-subtle px-5 py-8 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                </span>
                <p className="mt-3 text-[12px] font-semibold">
                  Credentials hidden after expiry
                </p>
                <p className="mx-auto mt-1 max-w-[360px] text-[10px] leading-4 text-muted-foreground">
                  {allocation.status === "interrupted"
                    ? "The upstream inventory expired before your package window. Your allocation was interrupted."
                    : "This BUYBIZ access period has ended. The shared credentials are no longer displayed."}
                </p>
                <Link
                  href="/dashboard/support"
                  className="mt-4 inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-[10px] font-medium hover:bg-accent"
                >
                  Contact support
                </Link>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-3">
          <section className="surface-card rounded-[16px] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Access window</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock3 className="h-3 w-3" />{" "}
                {packageActive ? (
                  <Countdown expiresAt={allocation.expiresAt} />
                ) : (
                  formatRemaining(allocation.expiresAt)
                )}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Activated</span>
                <span className="font-medium">{formatDateTime(allocation.activatedAt)}</span>
              </div>
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">{formatDateTime(allocation.expiresAt)}</span>
              </div>
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Upstream inventory expires</span>
                <span className="font-medium">{formatDateTime(allocation.inventoryExpiresAt)}</span>
              </div>
              {allocation.endedAt ? (
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-muted-foreground">Ended</span>
                  <span className="font-medium">{formatDateTime(allocation.endedAt)}</span>
                </div>
              ) : null}
            </div>
            {packageActive ? (
              <>
                <Progress value={remainingPct} className="mt-4 h-1.5" />
                <p className="mt-2 text-[9px] text-muted-foreground">
                  Displayed timestamps use WAT (Africa/Lagos). BUYBIZ stores
                  entitlement in UTC.
                </p>
              </>
            ) : null}
            <div className="mt-4 border-t border-border pt-3 text-[9.5px] leading-4 text-muted-foreground">
              This is a BUYBIZ access entitlement. It is measured from successful
              allocation, not from when you opened your dashboard.
            </div>
          </section>

          {packageActive && renewalExpiresAt ? (
            <section className="surface-card rounded-[16px] p-4">
              <h2 className="text-[13px] font-semibold">Renew this proxy</h2>
              <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                Add another {formatDuration(allocation.durationSeconds)} for{" "}
                {formatNaira(renewalPriceMinor, { exact: true })}. The extension
                starts from your current expiry. There is no auto-renewal.
              </p>
              <div className="mt-3 rounded-[9px] border border-border bg-surface-subtle px-3 py-2.5 text-[9.5px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Current expiry</span>
                  <span className="font-medium">{formatDateTime(allocation.expiresAt)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">New expiry</span>
                  <span className="font-medium">{formatDateTime(renewalExpiresAt)}</span>
                </div>
              </div>
              <div className="mt-3">
                <AdminActionForm
                  action={renewProxyAction}
                  hidden={{
                    allocationId: allocation.id,
                    idempotencyKey: renewalKey,
                  }}
                  submitLabel={`Renew for ${formatNaira(renewalPriceMinor, { exact: true })}`}
                  pendingLabel="Renewing…"
                  confirmMessage="Renew this proxy and debit your wallet?"
                >
                  <label className="flex items-start gap-2 text-[9.5px] leading-4 text-muted-foreground">
                    <input
                      type="checkbox"
                      name="confirm"
                      required
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border-strong accent-foreground"
                    />
                    I confirm the wallet debit. Renewal is only possible while the
                    proxy is active and upstream lifetime is sufficient.
                  </label>
                </AdminActionForm>
              </div>
            </section>
          ) : null}

          <section className="surface-card rounded-[16px] p-4">
            <h2 className="text-[13px] font-semibold">Allocation trail</h2>
            <div className="mt-3 space-y-3">
              <TimelineItem
                title="Order completed"
                detail={allocation.orderNumber}
                active
              />
              <TimelineItem
                title="Proxy allocated"
                detail={formatDateTime(allocation.activatedAt)}
                active
              />
              <TimelineItem
                title={
                  effective === "active"
                    ? "Access active"
                    : effective === "interrupted"
                      ? "Interrupted"
                      : "Access ended"
                }
                detail={
                  effective === "active"
                    ? `Until ${formatDateTime(allocation.expiresAt)}`
                    : formatDateTime(allocation.endedAt ?? allocation.expiresAt)
                }
                active={effective === "active"}
              />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <Link
                href={`/dashboard/orders/${allocation.orderId}`}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground hover:underline"
              >
                View order <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/dashboard/support"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Get support <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            Your credentials are decrypted only for you, only while this
            allocation is active. They are never included in admin list responses
            or logs.
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  title,
  detail,
  active,
}: {
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
          active
            ? "border-success/25 bg-success-soft text-success"
            : "border-border bg-surface-subtle text-muted-foreground",
        )}
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
      </span>
      <div>
        <p className="text-[10.5px] font-medium">{title}</p>
        <p className="mt-0.5 text-[9px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
