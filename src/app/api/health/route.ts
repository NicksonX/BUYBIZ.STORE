import { NextResponse } from "next/server";
import { isDemoMode, getConfigurationIssues } from "@/lib/config";
import { checkDatabaseHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseOk = await checkDatabaseHealth();
  const issues = getConfigurationIssues();
  const healthy = databaseOk;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      app: "BUYBIZ",
      mode: isDemoMode() ? "demo" : "production",
      database: databaseOk ? "reachable" : "unreachable",
      configurationIssues: issues.length,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
