import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { queueEmail, processEmailQueue } from "@/server/services/email";
import { createTestUser } from "../helpers";

const originalEnv = { ...process.env };
beforeAll(async () => { await getDb(); });

async function reset() {
  const db = await getDb();
  await db.query(`update email_provider_rotation set next_provider='resend', updated_at=now() where id=1`);
  await db.query(`insert into app_settings (key,value) values ('email_primary_provider','"resend"'::jsonb), ('email_rotation_enabled','false'::jsonb), ('email_brevo_enabled','false'::jsonb) on conflict (key) do update set value=excluded.value`);
  await db.query(`delete from email_provider_usage`);
  await db.query(`delete from email_provider_attempts`);
  await db.query(`delete from email_deliveries where dedupe_key like 'rotation:%'`);
}
beforeEach(async () => {
  process.env.EMAIL_API_KEY = "resend-test-key";
  process.env.BREVO_API_KEY = "brevo-test-key";
  process.env.EMAIL_FROM = "noreply@contactsupport.buybiz.store";
  process.env.EMAIL_PROVIDER = "resend";
  delete process.env.RESEND_DAILY_LIMIT;
  delete process.env.BREVO_DAILY_LIMIT;
  process.env.EMAIL_ROTATION_ENABLED = "false";
  await reset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  process.env = { ...originalEnv };
});
async function queue(label: string, type: "deposit_confirmation" | "welcome" = "deposit_confirmation") {
  const db = await getDb();
  const user = await createTestUser(`rot_${label}`);
  const id = await db.transaction((tx) => queueEmail(tx, {
    type,
    userId: user.id,
    recipient: user.email,
    data: { name: user.username, amountLabel: "$1.00" },
    dedupeKey: `rotation:${label}:${user.id}`,
  }));
  return id;
}
function mockProvider(status = 200) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify(status < 300 ? { id: "resend-id" } : {}), { status, headers: { "Content-Type": "application/json" } });
  }));
  return calls;
}

describe("Resend-only email delivery policy", () => {
  it("sends essential mail through Resend and never through Brevo", async () => {
    const calls = mockProvider();
    const id = await queue("first");
    expect(id).toBeTruthy();
    await processEmailQueue({ ids: [id!] });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("api.resend.com");
    const db = await getDb();
    const delivery = await db.query<{ provider: string; status: string }>(`select provider,status from email_deliveries where id=$1`, [id]);
    expect(delivery.rows[0]).toEqual({ provider: "resend", status: "sent" });
  });
  it("does not fall back to Brevo after a definite rejection", async () => {
    const calls = mockProvider(422);
    const id = await queue("reject");
    const result = await processEmailQueue({ ids: [id!] });
    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(calls).toHaveLength(1);
    const db = await getDb();
    const delivery = await db.query<{ provider: string; provider_status: string }>(`select provider,provider_status from email_deliveries where id=$1`, [id]);
    expect(delivery.rows[0]).toEqual({ provider: "resend", provider_status: "rejected" });
  });
  it("treats a 5xx as uncertain and does not fall back", async () => {
    const calls = mockProvider(503);
    const id = await queue("uncertain");
    const result = await processEmailQueue({ ids: [id!] });
    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(calls).toHaveLength(1);
    const db = await getDb();
    const delivery = await db.query<{ status: string; provider_status: string }>(`select status, provider_status from email_deliveries where id=$1`, [id]);
    expect(delivery.rows[0]).toEqual({ status: "queued", provider_status: "uncertain" });
  });
  it("suppresses policy-disabled routine email", async () => {
    const id = await queue("welcome", "welcome");
    expect(id).toBeNull();
    const db = await getDb();
    const rows = await db.query(`select 1 from email_deliveries where dedupe_key='rotation:welcome:' limit 1`);
    expect(rows.rows).toHaveLength(0);
  });
  it("does not send once the conservative Resend limit is reached", async () => {
    process.env.RESEND_DAILY_LIMIT = "1";
    const db = await getDb();
    await db.query(`insert into email_provider_usage (provider,usage_date,accepted_count) values ('resend',current_date,1)`);
    const calls = mockProvider();
    const id = await queue("quota");
    expect(id).toBeTruthy();
    await processEmailQueue({ ids: [id!] });
    expect(calls).toHaveLength(0);
    const delivery = await db.query<{ status: string; provider: string }>(`select status,provider from email_deliveries where id=$1`, [id]);
    expect(delivery.rows[0]).toEqual({ status: "queued", provider: null });
  });
});
