import "server-only";
import type { SqlTransaction } from "@/lib/db/driver";

export type AuditInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Append-only audit trail. Metadata must never contain passwords, tokens,
 * decrypted proxy credentials or payment secrets.
 */
export async function writeAuditLog(
  tx: SqlTransaction,
  input: AuditInput,
): Promise<void> {
  await tx.query(
    `insert into audit_logs
       (actor_user_id, actor_role, action, entity_type, entity_id, metadata,
        ip_address, user_agent)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
    [
      input.actorUserId ?? null,
      input.actorRole ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.ip ?? null,
      input.userAgent?.slice(0, 500) ?? null,
    ],
  );
}
