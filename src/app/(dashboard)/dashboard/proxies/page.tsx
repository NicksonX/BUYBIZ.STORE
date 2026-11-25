import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  KeyRound,
  Network,
  UserRound,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Countdown } from "@/components/dashboard/countdown";
import { requireUserPage } from "@/server/auth/guards";
import { getAllocationsForUser } from "@/server/data/customer";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

type EffectiveStatus =
  | "active"
  | "expired"
  | "interrupted"
  | "revoked"
  | "terminated";

function effectiveStatus(allocation: {
  status: string;
  expiresAt: Date;
  inventoryExpiresAt: Date;
}): EffectiveStatus {
  if (allocation.status === "terminated") return "terminated";
  if (allocation.status === "interrupted" || allocation.status === "revoked") {
    return "interrupted";
  }
  if (
    allocation.status === "expired" ||
    new Date(allocation.expiresAt) <= new Date() ||
    new Date(allocation.inventoryExpiresAt) <= new Date()
  ) {
    return allocation.status === "expired" ? "expired" : "expired";
  }
  return "active";
}

const statusTone = {
  active: "success",
  expired: "neutral",
  interrupted: "warning",
  revoked: "danger",
  terminated: "neutral",
} as const;

const filters = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "terminated", label: "Terminated" },
  { key: "interrupted", label: "Interrupted" },
] as const;

export default async function ProxiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const activeFilter = filters.some((filter) => filter.key === raw)
    ? (raw as (typeof filters)[number]["key"])
    : "all";

  const all = await getAllocationsForUser(user.id, "all", 100);
  const withStatus = all.map((allocation) => ({
    ...allocation,
    effective: effectiveStatus(allocation),
  }));
  const counts = {
    all: withStatus.length,
    active: withStatus.filter((item) => item.effective === "active").length,
    expired: withStatus.filter((item) => item.effective === "expired").length,
    terminated: withStatus.filter((item) => item.effective === "terminated").length,
    interrupted: withStatus.filter((item) => item.effective === "interrupted").length,
  };
  // Revoked allocations are grouped with interrupted for the customer view;
  // the detailed status remains visible on the allocation page.
  const filtered =
    activeFilter === "all"
      ? withStatus
      : withStatus.filter((item) => item.effective === activeFilter);

  return (
    <div>
      <PageHeader
        eyebrow="My proxies"
        title="Your proxy access windows."
        description="Each purchase has its own BUYBIZ entitlement and expiry. Credentials are shown only while your access window is active."
        actions={
          <Link
            href="/dashboard/marketplace"
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "h-9 rounded-full px-4",
            )}
          >
            Buy another proxy
          </Link>
        }
      />

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[10px] leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p><span className="font-semibold text-foreground">A quick note about maintenance 🛠️</span> We occasionally carry out maintenance on our proxy infrastructure to improve stability, reliability, and your overall experience. During these periods, some proxies may experience temporary interruptions. We appreciate your patience and understanding as we work to keep our services running smoothly.</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={
              filter.key === "all"
                ? "/dashboard/proxies"
                : `/dashboard/proxies?status=${filter.key}`
            }
            aria-current={activeFilter === filter.key ? "page" : undefined}
            className={cn(
              "tap-target inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[11.5px] font-medium transition-colors sm:min-h-7 sm:text-[10.5px]",
              activeFilter === filter.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
            <span
              className={cn(
                "text-[9px]",
                activeFilter === filter.key ? "text-background/55" : "text-muted-foreground/60",
              )}
            >
              {counts[filter.key]}
            </span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Network}
            title={
              activeFilter === "all"
                ? "No proxy allocations yet"
                : `No ${activeFilter} proxies`
            }
            description={
              activeFilter === "all"
                ? "Buy a plan and your shared proxy details will appear here with a live expiry countdown."
                : "Your other proxy allocations are still available in the other tabs."
            }
            action={
              <Link
                href="/dashboard/marketplace"
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "rounded-full px-4",
                )}
              >
                Browse plans
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filtered.map((allocation) => {
            const usable = allocation.effective === "active";
            const activated = new Date(allocation.activatedAt).getTime();
            const expires = new Date(allocation.expiresAt).getTime();
            const remainingPct = usable
              ? Math.max(0, Math.min(100, ((expires - Date.now()) / (expires - activated)) * 100))
              : 0;
            return (
              <article
                key={allocation.id}
                className={cn(
                  "surface-card relative overflow-hidden rounded-[15px] p-4 transition-colors sm:p-5",
                  usable ? "hover:border-border-strong" : "bg-surface-subtle/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border bg-surface-subtle">
                      <Network className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-[13px] font-semibold">
                        {allocation.productName}
                      </h2>
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                        {allocation.region ?? "Region not set"} ·{" "}
                        {allocation.protocol.toUpperCase()} · Order{" "}
                        {allocation.orderNumber}
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusTone[allocation.effective]} className="capitalize">
                    {allocation.effective}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[9px] border border-border bg-surface-subtle px-3 py-2">
                    <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Activated
                    </p>
                    <p className="mt-1 text-[10px] font-medium">
                      {formatDateTime(allocation.activatedAt)}
                    </p>
                  </div>
                  <div className="rounded-[9px] border border-border bg-surface-subtle px-3 py-2">
                    <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Expires
                    </p>
                    <p className="mt-1 text-[10px] font-medium">
                      {formatDateTime(allocation.expiresAt)}
                    </p>
                  </div>
                </div>

                {usable ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock3 className="h-3 w-3" /> Time remaining
                      </span>
                      <Countdown
                        expiresAt={allocation.expiresAt}
                        className="font-medium text-foreground"
                      />
                    </div>
                    <Progress value={remainingPct} className="mt-2 h-1" />
                  </div>
                ) : (
                  <div className="mt-3 rounded-[8px] border border-border bg-background/60 px-3 py-2 text-[9.5px] leading-4 text-muted-foreground">
                    {allocation.effective === "terminated"
                      ? "You terminated this proxy. Its capacity slot was released and any eligible refund is in your wallet."
                      : allocation.effective === "expired"
                        ? "This access period has ended. Connection credentials are hidden."
                        : "This allocation was interrupted when the upstream inventory expired. Credentials are hidden."}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                    {allocation.accessType === "single" ? (
                      <>
                        <UserRound className="h-3 w-3" /> One customer
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" /> Shared access
                      </>
                    )}
                  </span>
                  <Link
                    href={`/dashboard/proxies/${allocation.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground hover:underline"
                  >
                    {usable ? (
                      <>
                        <KeyRound className="h-3 w-3" /> Connection details
                      </>
                    ) : (
                      <>
                        View details <ArrowUpRight className="h-3 w-3" />
                      </>
                    )}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-4 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Your access period ends independently in our database. On a shared
          proxy, this hides your details but cannot individually revoke your
          network access. The Personal plan is limited to one customer. Full
          details are in the{" "}
          <Link href="/terms#expiry" className="underline underline-offset-2">
            Terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
