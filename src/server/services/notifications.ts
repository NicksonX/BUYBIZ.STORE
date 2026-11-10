import "server-only";
import type { SqlTransaction } from "@/lib/db/driver";
import type { NotificationType } from "@/lib/db/types";

export async function notifyUser(
  tx: SqlTransaction,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    href?: string | null;
  },
) {
  await tx.query(
    `insert into notifications (user_id, type, title, body, href)
     values ($1,$2,$3,$4,$5)`,
    [input.userId, input.type, input.title, input.body, input.href ?? null],
  );
}
