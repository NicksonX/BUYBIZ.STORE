import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { queueEmail, processEmailQueue } from "@/server/services/email";
import { createTestUser } from "../helpers";

const originalEnv = { ...process.env };

beforeAll(async () => { await getDb(); });

async function reset() {
  const db = await getDb();
  await db.query(`update email_provider_rotation set next_provider='resend', updated_at=now() where id=1`);
  await db.query(`insert into app_settings (key,value) values ('email_primary_provider','"resend"'::jsonb), ('email_rotation_enabled','true'::jsonb) on conflict (key) do update set value=excluded.value`);
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
  process.env.EMAIL_ROTATION_ENABLED = "true";
  await reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  process.env = { ...originalEnv };
});

async function queue(label: string) {
  const db = await getDb();
  const user = await createTestUser(`rot_${label}`);
  const id = await db.transaction((tx) => queueEmail(tx, {
    type: "welcome",
    userId: user.id,
    recipient: user.email,
    data: { name: user.username },
    dedupeKey: `rotation:${label}:${user.id}`,
  }));
  if (!id) throw new Error("Email did not queue");
  return id;
}

function mockProvider(statusFor: (url: string) => number = () => 200) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(String(url));
    const status = statusFor(String(url));
    return new Response(JSON.stringify(status < 300 ? { id: "resend-id", messageId: "brevo-id" } : {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }));
  return calls;
}

describe("email provider rotation", () => {
  it("alternates Resend and Brevo and persists the pointer", async () => {
    const calls = mockProvider();
    const first = await queue("first");
    const second = await queue("second");
    await processEmailQueue({ ids: [first] });
    await processEmailQueue({ ids: [second] });
    expect(calls[0]).toContain("api.resend.com");
    expect(calls[1]).toContain("api.brevo.com");
    const db = await getDb();
    const rotation = await db.query<{ next: string }>(`select next_provider as next from email_provider_rotation where id=1`);
    expect(rotation.rows[0].next).toBe("resend");
    const rows = await db.query<{ provider: string; status: string }>(`select provider,status from email_deliveries where dedupe_key like 'rotation:%' order by created_at`);
    expect(rows.rows.map((row) => row.provider)).toEqual(["resend", "brevo"]);
    expect(rows.rows.every((row) => row.status === "sent")).toBe(true);
  });

  it("falls back once after a definite provider rejection", async () => {
    const calls = mockProvider((url) => url.includes("resend.com") ? 422 : 200);
    const id = await queue("fallback");
    const result = await processEmailQueue({ ids: [id] });
    expect(result).toMatchObject({ sent: 1, failed: 0 });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("api.brevo.com");
    const db = await getDb();
    const delivery = await db.query<{ provider: string; status: string; fallback: boolean }>(
      `select provider,status,fallback_used as fallback from email_deliveries where id=$1`, [id]);
    expect(delivery.rows[0]).toEqual({ provider: "brevo", status: "sent", fallback: true });
  });

  it("does not fallback after an uncertain timeout/5xx", async () => {
    const calls = mockProvider(() => 503);
    const id = await queue("uncertain");
    const result = await processEmailQueue({ ids: [id] });
    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(calls).toHaveLength(1);
    const db = await getDb();
    const delivery = await db.query<{ status: string; provider_status: string }>(
      `select status, provider_status from email_deliveries where id=$1`, [id]);
    expect(delivery.rows[0]).toEqual({ status: "queued", provider_status: "uncertain" });
  });

  it("skips a provider whose configured daily limit is reached", async () => {
    process.env.RESEND_DAILY_LIMIT = "1";
    const db = await getDb();
    await db.query(`insert into email_provider_usage (provider,usage_date,accepted_count) values ('resend',current_date,1)`);
    const calls = mockProvider();
    const id = await queue("quota");
    await processEmailQueue({ ids: [id] });
    expect(calls[0]).toContain("api.brevo.com");
  });
});
