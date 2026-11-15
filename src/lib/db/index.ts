import "server-only";
import { Pool, types } from "pg";
import { isDemoMode } from "@/lib/config";
import type { Database } from "@/lib/db/driver";

export type { Database, SqlTransaction, SqlParam } from "@/lib/db/driver";

const globalForDb = globalThis as typeof globalThis & {
  __buybizDbPromise?: Promise<Database>;
};

// int8 (bigint) values such as money in kobo are safely within JavaScript's
// safe integer range for this application. Parse them as numbers consistently
// across PGlite and the pg driver.
types.setTypeParser(20, (value: string) => Number(value));

function createProductionDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Set the Supabase Postgres connection string in the server environment.",
    );
  }

  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");
  const sslEnabled =
    process.env.DATABASE_SSL !== "false" && !isLocal
      ? { rejectUnauthorized: false }
      : undefined;

  // Supabase's session pooler allows only 15 clients on this plan. Vercel runs
  // many short-lived instances, so each instance must hold a single connection
  // and release it quickly. Parallel dashboard queries queue on that connection
  // instead of exhausting the database and failing whole pages.
  const pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true,
    statement_timeout: 20_000,
    idle_in_transaction_session_timeout: 15_000,
    ssl: sslEnabled,
    application_name: "buybiz-web",
  });

  pool.on("error", (error: Error) => {
    console.error("[buybiz/db] idle client error:", error.message);
  });

  return {
    async query(text, params) {
      const result = await pool.query(text, params as unknown[] | undefined);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({
          async query(text, params) {
            const queryResult = await client.query(
              text,
              params as unknown[] | undefined,
            );
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount ?? 0,
            };
          },
        });
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export function getDb(): Promise<Database> {
  // Cache on globalThis so Turbopack module instances and HMR reloads share the
  // same PGlite connection instead of opening the database twice.
  if (!globalForDb.__buybizDbPromise) {
    globalForDb.__buybizDbPromise = isDemoMode()
      ? import("@/lib/db/pglite").then((mod) => mod.createDemoDatabase())
      : Promise.resolve(createProductionDatabase());
  }
  return globalForDb.__buybizDbPromise;
}

export async function checkDatabaseHealth() {
  try {
    const db = await getDb();
    await db.query("select 1 as ok");
    return true;
  } catch {
    return false;
  }
}
