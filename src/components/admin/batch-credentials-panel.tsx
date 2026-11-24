"use client";
import { KeyRound, ShieldAlert } from "lucide-react";
import { AdminActionForm } from "@/components/admin/action-form";
import { Input } from "@/components/ui/input";
import { rotateBatchCredentialsAction } from "@/server/actions/admin";

export function BatchCredentialsPanel({ group, active, expired, inventoryCount }: { group: string; active: number; expired: number; inventoryCount: number }) {
  return (
    <div className="border-b border-border bg-surface-subtle/35 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="flex items-center gap-1.5 text-[10px] font-semibold"><KeyRound className="h-3.5 w-3.5" /> Update all credentials in this batch</p><p className="mt-0.5 text-[8.5px] text-muted-foreground">Applies the same new username and password to {inventoryCount} inventory record{inventoryCount === 1 ? "" : "s"}. Hosts and ports do not change.</p></div>
        <div className="flex gap-3 text-right text-[8.5px]"><span className="text-success">{active} active</span><span className="text-muted-foreground">{expired} expired</span></div>
      </div>
      <div className="mt-2"><AdminActionForm action={rotateBatchCredentialsAction} hidden={{ credentialGroup: group }} submitLabel="UPDATE BATCH CREDENTIALS" pendingLabel="Updating batch…" compact variant="outline" refreshOnSuccess confirmMessage={`Update credentials for all ${inventoryCount} proxies in this batch? Only ${active} active customers will be emailed; ${expired} expired allocations are excluded.`}>
        <div className="grid gap-2 sm:grid-cols-2"><Input name="username" placeholder="New username for every proxy in this batch" required className="h-8 text-[10px]" /><Input name="password" type="password" placeholder="New password for every proxy in this batch" required className="h-8 text-[10px]" /></div>
        <label className="flex items-start gap-2 text-[8.5px] leading-4 text-warning"><input type="checkbox" name="confirm" required className="mt-0.5 h-3.5 w-3.5" /><span className="flex items-start gap-1"><ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />I changed the upstream credentials for this batch and reviewed the active customer count.</span></label>
      </AdminActionForm></div>
    </div>
  );
}
