import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createAndSendSignupOtp, verifySignupOtp } from "@/server/services/email-otp";
import { createTestUser } from "../helpers";

beforeAll(async () => {
  await getDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.EMAIL_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_PROVIDER;
});

describe("HTTPS OTP email and verification", () => {
  it("sends a branded six-digit code, never stores the code, and verifies once", async () => {
    process.env.EMAIL_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "hello@buybiz.test";
    process.env.EMAIL_PROVIDER = "resend";
    let otpHtml = "";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        subject?: string;
        html?: string;
      };
      if (body.subject?.includes("verification")) otpHtml = body.html ?? "";
      return new Response(JSON.stringify({ id: "mock-email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Keep this test independent of older queued email fixtures from other
    // integration files that share the in-memory database.
    const db = await getDb();
    await db.query(`delete from email_deliveries where status in ('queued', 'sending')`);
    await db.query(`insert into app_settings (key,value) values ('email_primary_provider','"resend"'::jsonb), ('email_rotation_enabled','false'::jsonb), ('email_brevo_enabled','false'::jsonb) on conflict (key) do update set value=excluded.value`);

    const user = await createTestUser("otp", { verified: false });
    const sent = await createAndSendSignupOtp({
      userId: user.id,
      email: user.email,
      name: user.username,
    });
    expect(sent.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    const code = otpHtml.match(/>(\d{6})</)?.[1];
    expect(code).toMatch(/^\d{6}$/);

    const delivery = await db.query<{ payload: unknown; status: string }>(
      `select payload, status from email_deliveries
        where user_id=$1 and email_type='signup_verification'
        order by created_at desc limit 1`,
      [user.id],
    );
    expect(delivery.rows[0].status).toBe("sent");
    expect(JSON.stringify(delivery.rows[0].payload)).not.toContain(code!);

    const verified = await verifySignupOtp({
      email: user.email,
      code: code!,
    });
    expect(verified.id).toBe(user.id);
    const profile = await db.query<{ emailVerified: boolean }>(
      `select email_verified as "emailVerified" from profiles where id=$1`,
      [user.id],
    );
    expect(profile.rows[0].emailVerified).toBe(true);
    await expect(
      verifySignupOtp({ email: user.email, code: code! }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const welcome = await db.query<{ count: number; status: string }>(
      `select count(*)::int as count, max(status) as status
         from email_deliveries
        where user_id=$1 and email_type='welcome'`,
      [user.id],
    );
    expect(welcome.rows[0].count).toBe(0);
  });
});
