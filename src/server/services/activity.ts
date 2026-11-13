import "server-only";
import type { SqlTransaction } from "@/lib/db/driver";

/**
 * Records a meaningful customer-initiated action. Authentication refreshes,
 * scheduled jobs and passive page reads must never call this.
 */
export async function recordCustomerActivity(
  tx: SqlTransaction,
  userId: string,
) {
  await tx.query(
    `update profiles
        set last_activity_at = now(), updated_at = now()
      where id = $1 and role = 'customer' and status = 'active'`,
    [userId],
  );
}
