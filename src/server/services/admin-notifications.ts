import "server-only";
import type { SqlTransaction } from "@/lib/db/driver";

export async function notifyAdmin(
  tx: SqlTransaction,
  input: {
    type: string;
    severity?: "info" | "warning" | "critical";
    title: string;
    body: string;
    actionUrl?: string | null;
    relatedInventoryId?: string | null;
    relatedUserId?: string | null;
    dedupeKey: string;
  },
) {
  await tx.query(
    `insert into admin_notifications
       (type, severity, title, body, action_url, related_inventory_id,
        related_user_id, dedupe_key)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (dedupe_key) do nothing`,
    [
      input.type,
      input.severity ?? "info",
      input.title,
      input.body,
      input.actionUrl ?? null,
      input.relatedInventoryId ?? null,
      input.relatedUserId ?? null,
      input.dedupeKey,
    ],
  );
}
