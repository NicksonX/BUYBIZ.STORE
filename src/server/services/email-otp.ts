import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isEmailConfigured } from "@/lib/email/config";
import {
  flushEmailQueue,
  queueWelcomeEmail,
  sendOtpEmail,
} from "@/server/services/email";

function otpSecret() {
  return (
    process.env.EMAIL_OTP_SECRET?.trim() ||
    process.env.PROXY_CREDENTIAL_ENCRYPTION_KEY?.trim() ||
    process.env.RATE_LIMIT_SALT?.trim() ||
    "buybiz-local-otp-secret"
  );
}

function hashOtp(email: string, code: string) {
  return createHmac("sha256", otpSecret())
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

function sameHash(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function otpSettings() {
  const db = await getDb();
  const result = await db.query<{ key: string; value: unknown }>(
    `select key, value from app_settings
      where key in ('email_otp_ttl_minutes','email_otp_resend_seconds')`,
  );
  const map = new Map(result.rows.map((row) => [row.key, row.value]));
  return {
    ttlMinutes: Math.min(30, Math.max(5, Number(map.get("email_otp_ttl_minutes") ?? 10))),
    resendSeconds: Math.min(300, Math.max(30, Number(map.get("email_otp_resend_seconds") ?? 60))),
  };
}

export async function createAndSendSignupOtp(input: {
  userId: string;
  email: string;
  name: string;
}) {
  if (!isEmailConfigured()) {
    return {
      sent: false as const,
      reason: "Email provider is not configured.",
      codeCreated: false,
    };
  }
  const db = await getDb();
  const settings = await otpSettings();
  const open = await db.query<{ id: string; lastSentAt: Date }>(
    `select id, last_sent_at as "lastSentAt" from email_otps
      where lower(email)=lower($1) and purpose='signup' and consumed_at is null
      order by created_at desc limit 1`,
    [input.email],
  );
  if (open.rows[0]) {
    const elapsed = (Date.now() - new Date(open.rows[0].lastSentAt).getTime()) / 1000;
    if (elapsed < settings.resendSeconds) {
      return {
        sent: false as const,
        reason: `Please wait ${Math.ceil(settings.resendSeconds - elapsed)} seconds before requesting another code.`,
        codeCreated: false,
      };
    }
  }
  const code = String(randomInt(100_000, 1_000_000));
  const expiresAt = new Date(Date.now() + settings.ttlMinutes * 60_000);
  const otp = await db.transaction(async (tx) => {
    await tx.query(
      `update email_otps set consumed_at=now()
        where lower(email)=lower($1) and purpose='signup' and consumed_at is null`,
      [input.email],
    );
    return (
      await tx.query<{ id: string }>(
        `insert into email_otps
           (user_id, email, purpose, code_hash, expires_at, last_sent_at)
         values ($1,$2,'signup',$3,$4,now()) returning id`,
        [input.userId, input.email.trim().toLowerCase(), hashOtp(input.email, code), expiresAt],
      )
    ).rows[0].id;
  });
  const sent = await sendOtpEmail({
    userId: input.userId,
    email: input.email,
    name: input.name,
    code,
    expiresMinutes: settings.ttlMinutes,
    otpId: otp,
  });
  if (!sent.ok) {
    return { sent: false as const, reason: sent.error, codeCreated: true };
  }
  return { sent: true as const, expiresMinutes: settings.ttlMinutes, reason: null };
}

export async function verifySignupOtp(input: { email: string; code: string }) {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new AppError("VALIDATION", "Enter the 6-digit code from your email.");
  }
  const db = await getDb();
  const result = await db.query<{
    id: string;
    userId: string | null;
    codeHash: string;
    expiresAt: Date;
    attempts: number;
  }>(
    `select id, user_id as "userId", code_hash as "codeHash",
            expires_at as "expiresAt", attempts
       from email_otps
      where lower(email)=lower($1) and purpose='signup' and consumed_at is null
      order by created_at desc limit 1 for update`,
    [email],
  );
  const otp = result.rows[0];
  if (!otp) throw new AppError("VALIDATION", "No active code was found. Request a new code.");
  if (new Date(otp.expiresAt).getTime() <= Date.now()) {
    throw new AppError("VALIDATION", "That code has expired. Request a new code.");
  }
  if (Number(otp.attempts) >= 5) {
    throw new AppError("VALIDATION", "Too many incorrect attempts. Request a new code.");
  }
  if (!sameHash(otp.codeHash, hashOtp(email, code))) {
    await db.query(`update email_otps set attempts=attempts+1 where id=$1`, [otp.id]);
    throw new AppError("VALIDATION", "That code is not correct. Check it and try again.");
  }
  const userId = await db.transaction(async (tx) => {
    const consumed = await tx.query(
      `update email_otps set consumed_at=now() where id=$1 and consumed_at is null returning user_id as "userId"`,
      [otp.id],
    );
    if (!consumed.rows[0]) throw new AppError("CONFLICT", "This code has already been used.");
    const profile = await tx.query<{ id: string; email: string; name: string }>(
      `update profiles set email_verified=true, updated_at=now()
        where lower(email)=lower($1)
        returning id, email, coalesce(display_name,username) as name`,
      [email],
    );
    if (!profile.rows[0]) throw new AppError("NOT_FOUND", "No account matches this email.");
    return { id: profile.rows[0].id, email: profile.rows[0].email, name: profile.rows[0].name };
  });
  // Supabase Auth still requires the auth.users confirmation flag on projects
  // where email confirmation is enabled. Set it server-side after our OTP.
  try {
    await db.query(
      `update auth.users
          set email_confirmed_at=coalesce(email_confirmed_at, now()),
              updated_at=now()
        where lower(email)=lower($1)`,
      [email],
    );
  } catch (error) {
    console.warn(
      "[buybiz/otp] auth.users confirmation update skipped",
      error instanceof Error ? error.message : error,
    );
  }
  await queueWelcomeEmail(userId.id);
  await flushEmailQueue(5);
  return userId;
}

export async function resendSignupOtp(input: {
  userId: string;
  email: string;
  name: string;
}) {
  return createAndSendSignupOtp(input);
}
