import { config } from "dotenv";

// Next.js loads .env.local automatically. Standalone scripts do not.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const { getDb } = await import("../src/lib/db");
  const { reconcilePendingDeposits } = await import(
    "../src/server/services/deposits"
  );
  const db = await getDb();
  const lifecycle = await db.query<{ lifecycle: unknown }>(
    "select run_lifecycle_jobs() as lifecycle",
  );
  const deposits = await reconcilePendingDeposits();
  console.log(
    JSON.stringify(
      {
        ok: true,
        lifecycle: lifecycle.rows[0]?.lifecycle ?? null,
        deposits,
        finishedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[buybiz/lifecycle]", error);
  process.exit(1);
});
