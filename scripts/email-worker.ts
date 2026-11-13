import { processEmailQueue } from "@/server/services/email";
import { runDepositFollowupJobs } from "@/server/services/email-followups";
import { getDb } from "@/lib/db";

async function main() {
  await getDb();
  const followups = await runDepositFollowupJobs();
  const queue = await processEmailQueue({ limit: 50 });
  console.log(JSON.stringify({ ok: true, followups, queue }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[buybiz/email-worker] failed", error);
    process.exit(1);
  });
