import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type {
  Database,
  QueryResult,
  SqlParam,
  SqlTransaction,
} from "@/lib/db/driver";

// Demo mode defaults to an in-memory PostgreSQL instance. This avoids file
// lock conflicts between dev-server workers and means the demo dataset is
// rebuilt cleanly on every start. Set DEMO_DB_DIR to a filesystem path only if
// you need local persistence.
const DEFAULT_DATA_DIR = "memory://";

function mapParams(params?: SqlParam[]) {
  return params as unknown[] | undefined;
}

export async function createDemoDatabase(options?: {
  dataDir?: string;
  seed?: boolean;
}): Promise<Database> {
  const dataDir = options?.dataDir ?? process.env.DEMO_DB_DIR ?? DEFAULT_DATA_DIR;
  const memory = dataDir === "memory://";
  if (!memory) {
    await mkdir(path.dirname(dataDir), { recursive: true });
  }
  const pglite = memory ? new PGlite("memory://") : new PGlite(dataDir);
  await pglite.waitReady;

  const query = async <T>(
    text: string,
    params?: SqlParam[],
  ): Promise<QueryResult<T>> => {
    const result = await pglite.query<T>(text, mapParams(params));
    return {
      rows: result.rows,
      rowCount: result.affectedRows ?? result.rows.length,
    };
  };

  const existing = await query<{ name: string | null }>(
    `select to_regclass('public.profiles')::text as name`,
  );

  if (!existing.rows[0]?.name) {
    const coreSql = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20261110000100_core_schema.sql",
      ),
      "utf8",
    );
    await pglite.exec(coreSql);
  }

  const transfersSql = await readFile(
    path.join(
      process.cwd(),
      "supabase/migrations/20261110000500_internal_transfers.sql",
    ),
    "utf8",
  );
  await pglite.exec(transfersSql);

  const transferTablesSql = await readFile(
    path.join(
      process.cwd(),
      "supabase/migrations/20261110000510_internal_transfers_tables.sql",
    ),
    "utf8",
  );
  await pglite.exec(transferTablesSql);

  for (const migration of [
    "20261110000700_referral_enum.sql",
    "20261110000710_referrals.sql",
    "20261110000720_personal_proxy.sql",
    "20261110000900_proxy_renewals.sql",
    "20261113000100_onboarding.sql",
    "20261113000200_proxy_management_enum.sql",
    "20261113000300_proxy_management.sql",
    "20261114000100_account_frozen_enum.sql",
    "20261114000200_inactivity.sql",
    "20261114000300_proxy_rotation.sql",
    "20261114000400_scheduled_admin_jobs.sql",
    "20261114000600_wallet_minimum.sql",
    "20261115000100_ambassador_email.sql",
    "20261115000200_email_preferences_trigger.sql",
    "20261116000100_campaigns_usd_rewards.sql",
    "20261116000300_campaign_policy.sql",
    "20261116000400_campaign_emails.sql",
    "20261116000500_email_polish.sql",
  ]) {
    const referralSql = await readFile(
      path.join(process.cwd(), "supabase/migrations", migration),
      "utf8",
    );
    await pglite.exec(referralSql);
  }

  const demoSql = await readFile(
    path.join(process.cwd(), "supabase/demo/demo_schema.sql"),
    "utf8",
  );
  await pglite.exec(demoSql);

  if (options?.seed !== false && process.env.DEMO_SEED !== "false") {
    const { seedDemoData } = await import("@/lib/db/demo-seed");
    await seedDemoData({
      query,
      transaction: async (fn) => fn({ query }),
      close: async () => undefined,
    });
  }

  // PGlite is single-connection. Serialise application transactions to avoid
  // overlapping BEGIN statements during local development; PostgreSQL on
  // Supabase handles true concurrency with row locks.
  let queue: Promise<unknown> = Promise.resolve();
  const transaction = async <T>(
    fn: (tx: SqlTransaction) => Promise<T>,
  ): Promise<T> => {
    const run = () =>
      pglite.transaction(async (tx) =>
        fn({
          async query<T2>(text: string, params?: SqlParam[]) {
            const result = await tx.query<T2>(text, mapParams(params));
            return {
              rows: result.rows,
              rowCount: result.affectedRows ?? result.rows.length,
            };
          },
        }),
      );
    const result = queue.then(run, run);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    query,
    transaction,
    close: () => pglite.close(),
  };
}
