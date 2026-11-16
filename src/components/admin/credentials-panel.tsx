"use client";

import { useActionState } from "react";
import { Eye, KeyRound, ShieldAlert } from "lucide-react";
import {
  revealCredentialsAction,
  rotateCredentialsAction,
  type CredentialsState,
} from "@/server/actions/admin";
import { initialActionState } from "@/lib/validation/action-state";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { AdminNote } from "@/components/admin/field";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/ui/loading-dots";

export function CredentialsPanel({
  inventoryId,
  hasCredentials,
  activeCustomers,
  expiredCustomers,
  rotationActionLabel = "CONFIRM CREDENTIAL ROTATION",
}: {
  inventoryId: string;
  hasCredentials: boolean;
  activeCustomers?: number;
  expiredCustomers?: number;
  rotationActionLabel?: string;
}) {
  const [revealState, revealAction, revealing] = useActionState<
    CredentialsState,
    FormData
  >(revealCredentialsAction, initialActionState);
  const [rotateState, rotateAction, rotating] = useActionState(
    rotateCredentialsAction,
    initialActionState,
  );

  return (
    <section className="surface-card overflow-hidden rounded-[14px]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div>
          <h2 className="text-[12px] font-semibold">Upstream credentials</h2>
          <p className="mt-0.5 text-[9.5px] text-muted-foreground">
            Encrypted at rest. Every reveal is written to the audit log.
          </p>
        </div>
        <BadgeLike>{hasCredentials ? "Encrypted" : "No credentials"}</BadgeLike>
      </div>
      <div className="p-4">
        {hasCredentials ? (
          <form action={revealAction}>
            <input type="hidden" name="inventoryId" value={inventoryId} />
            <button
              type="submit"
              disabled={revealing}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-medium hover:bg-accent disabled:opacity-50"
            >
              {revealing ? <LoadingDots /> : <Eye className="h-3 w-3" />}
              Reveal credentials
            </button>
          </form>
        ) : (
          <AdminNote>No upstream credentials are stored for this proxy.</AdminNote>
        )}

        {revealState.message ? (
          <p className={`mt-2 text-[9.5px] ${revealState.status === "success" ? "text-warning" : "text-danger"}`}>
            {revealState.message}
          </p>
        ) : null}

        {revealState.credentials ? (
          <div className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[8px] border border-border bg-surface-subtle p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Username</p>
                  {revealState.credentials.username ? <CopyButton value={revealState.credentials.username} label="Copy" /> : null}
                </div>
                <p className="mt-1 break-all font-mono text-[10.5px]">{revealState.credentials.username ?? "Not required"}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-surface-subtle p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Password</p>
                  {revealState.credentials.password ? <CopyButton value={revealState.credentials.password} label="Copy" /> : null}
                </div>
                <p className="mt-1 break-all font-mono text-[10.5px]">{revealState.credentials.password ?? "Not required"}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-[8.5px] leading-4 text-warning">
              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
              Do not paste credentials into chat, tickets or logs. Customers on this proxy share them while active.
            </div>
          </div>
        ) : null}

        <details className="mt-4 border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> Rotate credentials</span>
            <span className="text-[8.5px]">Affects all active customers</span>
          </summary>
          <div className="mt-3">
            {rotateState.message ? (
              <Alert tone={rotateState.status === "success" ? "success" : "danger"} className="mb-3 text-[10px]">
                {rotateState.message}
              </Alert>
            ) : null}
            <form action={rotateAction} className="space-y-2.5">
              <input type="hidden" name="inventoryId" value={inventoryId} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input name="username" placeholder="New upstream username" required className="h-9 text-[11px]" />
                <Input name="password" placeholder="New upstream password" required type="password" className="h-9 text-[11px]" />
                <Input name="host" placeholder="New host (optional)" className="h-9 text-[11px]" />
                <Input name="port" placeholder="New port (optional)" type="number" min={1} max={65535} className="h-9 text-[11px]" />
              </div>
              <p className="text-[8.5px] leading-4 text-warning">
                Rotating shared credentials may disconnect every active customer on this proxy. Only do this when the upstream provider has changed the login. BUYBIZ will show the new credentials to every active customer without changing their individual expiry. If active customers would be affected, the rotation centre shows the exact count and requires an explicit confirmation.
              </p>
              {typeof activeCustomers === "number" ? (
                <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-border bg-surface-subtle p-2.5 text-[9px]">
                  <span className="text-muted-foreground">Active customers</span>
                  <span className="tabular text-right font-semibold">{activeCustomers}</span>
                  <span className="text-muted-foreground">Expired / ended</span>
                  <span className="tabular text-right">{expiredCustomers ?? 0}</span>
                </div>
              ) : null}
              <label className="flex items-start gap-2 text-[9px] leading-4 text-muted-foreground">
                <input type="checkbox" name="confirm" required className="mt-0.5 h-3.5 w-3.5 accent-foreground" />
                I understand the shared-customer impact.
              </label>
              <button
                type="submit"
                disabled={rotating}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-3 text-[9.5px] font-medium text-danger disabled:opacity-50"
              >
                {rotating ? <LoadingDots /> : null}
                {rotationActionLabel}
              </button>
            </form>
          </div>
        </details>
      </div>
    </section>
  );
}

function BadgeLike({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-subtle px-2 py-0.5 text-[8.5px] text-muted-foreground">
      {children}
    </span>
  );
}
