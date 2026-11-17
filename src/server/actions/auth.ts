"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import type { Profile } from "@/lib/db/types";
import { AppError, toUserMessage } from "@/lib/errors";
import { getAppUrl, isDemoMode, isSupabaseAuthConfigured } from "@/lib/config";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { getClientIp, getRequestMeta, rateLimit, rateLimitByIp } from "@/lib/security/rate-limit";
import { isEmailConfigured } from "@/lib/email/config";
import {
  createAndSendSignupOtp,
  verifySignupOtp,
} from "@/server/services/email-otp";
import { flushEmailQueue } from "@/server/services/email";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
  zodFieldErrors,
} from "@/lib/validation/schemas";
import {
  formError,
  formSuccess,
  type ActionState,
} from "@/lib/validation/action-state";
import { getCurrentUser } from "@/server/auth/session";
import {
  clearDemoSessionCookie,
  setDemoSessionCookie,
} from "@/server/auth/demo-cookie";
import { writeAuditLog } from "@/server/services/audit";
import { recordCustomerActivity } from "@/server/services/activity";
import {
  attachReferralForSignup,
  validateReferralCode,
} from "@/server/services/referrals";

function defaultLanding(
  profile: Pick<Profile, "role" | "onboardingComplete" | "status">,
) {
  if (profile.status === "frozen") return "/reactivate";
  if (!profile.onboardingComplete) return "/onboarding";
  if (profile.role === "admin" || profile.role === "super_admin" || profile.role === "support") {
    return "/admin";
  }
  return "/dashboard";
}

function tooMany(retryAfterSeconds: number): ActionState {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return formError(
    `Too many attempts. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  );
}

function mapSupabaseAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Your email is not verified yet. Check your inbox or request a new verification email.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email may already exist. Try signing in instead.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (normalized.includes("password")) {
    return "That password does not meet the requirements. Use at least 8 characters with a letter and a number.";
  }
  return "We could not complete that request. Please try again.";
}

export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limit = await rateLimitByIp("auth:login", 12, 60);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const next = safeNextPath(parsed.data.next, "");
  let destination = "";

  try {
    if (isDemoMode()) {
      const db = await getDb();
      const result = await db.query<
        Profile & { passwordHash: string }
      >(
        `select p.id, p.username, p.email, p.display_name as "displayName",
                p.avatar_url as "avatarUrl", p.role, p.status,
                p.email_verified as "emailVerified",
                p.onboarding_complete as "onboardingComplete",
                p.created_at as "createdAt", p.updated_at as "updatedAt",
                c.password_hash as "passwordHash"
           from demo_credentials c
           join profiles p on p.id = c.user_id
          where lower(c.email) = lower($1)
          limit 1`,
        [parsed.data.email],
      );
      const row = result.rows[0];
      if (!row || !verifyPassword(parsed.data.password, row.passwordHash)) {
        return formError("Incorrect email or password.");
      }
      if (row.status === "suspended") {
        return formError(
          "This account is suspended. Contact support if you believe this is a mistake.",
        );
      }
      await setDemoSessionCookie(row.id);
      await db.transaction((tx) => recordCustomerActivity(tx, row.id));
      destination = next || defaultLanding(row);
    } else {
      if (!isSupabaseAuthConfigured()) {
        return formError("Authentication is not configured for this deployment.");
      }
      const supabase = await createSupabaseServerClient();
      if (!supabase) return formError("Authentication is not configured.");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error || !data.user) {
        return formError(mapSupabaseAuthError(error?.message ?? ""));
      }
      const { ensureProfileForAuthUser } = await import("@/server/auth/session");
      const profile = await ensureProfileForAuthUser(data.user);
      if (profile.status === "suspended") {
        await supabase.auth.signOut();
        return formError(
          "This account is suspended. Contact support if you believe this is a mistake.",
        );
      }
      const activityDb = await getDb();
      await activityDb.transaction((tx) => recordCustomerActivity(tx, profile.id));
      destination = next || defaultLanding(profile);
    }
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/auth] login failed", error);
    return formError("We could not sign you in. Please try again.");
  }

  redirect(destination);
}

export async function signupAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms"),
    referralCode: formData.get("referralCode") ?? "",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  // Only genuine, valid signup attempts consume a bucket. Keying by email+IP
  // prevents one noisy network from locking out unrelated first-time users.
  const ip = await getClientIp();
  const emailKey = parsed.data.email.trim().toLowerCase();
  const emailLimit = await rateLimit({
    action: "auth:signup:email",
    identifier: `${ip}:${emailKey}`,
    limit: 20,
    windowSeconds: 300,
  });
  if (!emailLimit.allowed) return formError("Too many signup attempts. Please try again in 5 minutes.");
  const ipLimit = await rateLimit({
    action: "auth:signup:ip",
    identifier: ip,
    limit: 100,
    windowSeconds: 300,
  });
  if (!ipLimit.allowed) return formError("Too many signup attempts. Please try again in 5 minutes.");

  const db = await getDb();
  const duplicates = await db.query<{ username: string; email: string }>(
    `select username, email from profiles
      where lower(username) = lower($1) or lower(email) = lower($2)
      limit 2`,
    [parsed.data.username, parsed.data.email],
  );
  const fieldErrors: Record<string, string> = {};
  for (const row of duplicates.rows) {
    if (row.username.toLowerCase() === parsed.data.username.toLowerCase()) {
      fieldErrors.username = "That username is already taken.";
    }
    if (row.email.toLowerCase() === parsed.data.email.toLowerCase()) {
      fieldErrors.email = "An account with that email already exists.";
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return formError("Please choose different details.", fieldErrors);
  }

  if (parsed.data.referralCode) {
    const referral = await validateReferralCode(
      parsed.data.referralCode,
      parsed.data.email,
    );
    if (!referral.valid) {
      return formError("Check the referral code.", {
        referralCode: "That referral code is not valid, active or usable for this email.",
      });
    }
  }

  let destination: string | null = null;
  let providerError: ActionState | null = null;

  try {
    if (isDemoMode()) {
      const passwordHash = hashPassword(parsed.data.password);
      const profileId = await db.transaction(async (tx) => {
        const inserted = await tx.query<{ id: string }>(
          `insert into profiles
             (id, username, email, role, status, email_verified, onboarding_complete)
           values (gen_random_uuid(), $1, $2, 'customer', 'active', false, false)
           returning id`,
          [parsed.data.username, parsed.data.email],
        );
        const newId = inserted.rows[0].id;
        await tx.query(
          `insert into demo_credentials (user_id, email, password_hash)
           values ($1,$2,$3)`,
          [newId, parsed.data.email, passwordHash],
        );
        await attachReferralForSignup(
          tx,
          newId,
          parsed.data.referralCode,
        );
        return newId;
      });
      await setDemoSessionCookie(profileId);
      destination = "/verify-email?next=/onboarding";
    } else {
      if (!isSupabaseAuthConfigured()) {
        return formError("Authentication is not configured for this deployment.");
      }
      const supabase = await createSupabaseServerClient();
      if (!supabase) return formError("Authentication is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            username: parsed.data.username,
            display_name: parsed.data.username,
          },
          emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding`,
        },
      });
      if (error) providerError = formError(mapSupabaseAuthError(error.message));
      else if (data.user) {
        if (parsed.data.referralCode) {
          try {
            await db.transaction((tx) =>
              attachReferralForSignup(tx, data.user!.id, parsed.data.referralCode),
            );
          } catch (referralError) {
            console.error("[buybiz/auth] referral attach failed", referralError);
          }
        }
        if (isEmailConfigured()) {
          try {
            const otp = await createAndSendSignupOtp({
              userId: data.user.id,
              email: parsed.data.email,
              name: parsed.data.username,
            });
            if (!otp.sent) {
              console.warn("[buybiz/auth] OTP email not sent", otp.reason);
            }
          } catch (otpError) {
            console.error("[buybiz/auth] OTP setup failed", otpError);
          }
          destination = `/verify-email?email=${encodeURIComponent(parsed.data.email)}&next=/onboarding`;
        } else if (data.session) {
          destination = "/onboarding";
        } else {
          destination = `/verify-email?email=${encodeURIComponent(parsed.data.email)}`;
        }
      }
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return formError("That username or email is already in use.", {
        username: "That username is already taken.",
      });
    }
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/auth] signup failed", error);
    return formError("We could not create your account. Please try again.");
  }

  if (providerError) return providerError;
  if (isEmailConfigured()) await flushEmailQueue(5);
  if (destination) redirect(destination);
  return formError("We could not create your account. Please try again.");
}

export async function forgotPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limit = await rateLimitByIp("auth:forgot", 5, 900);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return formError("Enter a valid email address.", zodFieldErrors(parsed.error));
  }

  const genericMessage =
    "If an account exists for that email, password reset instructions have been sent.";

  try {
    if (isDemoMode()) {
      const db = await getDb();
      const profile = await db.query<{ id: string }>(
        `select id from profiles where lower(email) = lower($1) limit 1`,
        [parsed.data.email],
      );
      if (profile.rows[0]) {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await db.query(
          `insert into demo_password_resets (user_id, token_hash, expires_at)
           values ($1,$2,now() + interval '30 minutes')`,
          [profile.rows[0].id, tokenHash],
        );
        return formSuccess(genericMessage, {
          resetUrl: `/reset-password?token=${token}`,
        });
      }
      return formSuccess(genericMessage);
    }

    if (!isSupabaseAuthConfigured()) {
      return formError("Authentication is not configured for this deployment.");
    }
    const supabase = await createSupabaseServerClient();
    if (!supabase) return formError("Authentication is not configured.");
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
    });
    return formSuccess(genericMessage);
  } catch (error) {
    console.error("[buybiz/auth] forgot password failed", error);
    return formError("We could not process that request. Please try again.");
  }
}

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limit = await rateLimitByIp("auth:reset", 8, 900);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token") ?? undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  try {
    if (isDemoMode()) {
      if (!parsed.data.token) {
        return formError("This reset link is missing its token.");
      }
      const tokenHash = createHash("sha256")
        .update(parsed.data.token)
        .digest("hex");
      const db = await getDb();
      const row = await db.query<{
        id: string;
        userId: string;
        expiresAt: Date;
        usedAt: Date | null;
      }>(
        `select id, user_id as "userId", expires_at as "expiresAt", used_at as "usedAt"
           from demo_password_resets where token_hash = $1 limit 1`,
        [tokenHash],
      );
      const reset = row.rows[0];
      if (!reset || reset.usedAt || new Date(reset.expiresAt) <= new Date()) {
        return formError(
          "This password reset link is invalid or has expired. Request a new one.",
        );
      }
      const passwordHash = hashPassword(parsed.data.password);
      await db.transaction(async (tx) => {
        await tx.query(
          `update demo_credentials set password_hash = $1 where user_id = $2`,
          [passwordHash, reset.userId],
        );
        await tx.query(
          `update demo_password_resets set used_at = now() where id = $1`,
          [reset.id],
        );
        await tx.query(
          `delete from demo_password_resets where user_id = $1 and id <> $2`,
          [reset.userId, reset.id],
        );
      });
      return formSuccess("Password updated. You can now sign in.");
    }

    const user = await getCurrentUser();
    if (!user) {
      return formError(
        "Your reset session has expired. Request a new password reset link.",
      );
    }
    const supabase = await createSupabaseServerClient();
    if (!supabase) return formError("Authentication is not configured.");
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return formError(mapSupabaseAuthError(error.message));
    return formSuccess("Password updated. You can now sign in.");
  } catch (error) {
    console.error("[buybiz/auth] reset password failed", error);
    return formError("We could not update your password. Request a new link.");
  }
}

export async function verifyEmailDemoAction(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? "/dashboard"));
  if (!isDemoMode()) redirect("/verify-email");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  await db.query(`update profiles set email_verified = true where id = $1`, [user.id]);
  redirect(next);
}

export async function verifyOtpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limit = await rateLimitByIp("auth:verify-otp", 12, 600);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? "/onboarding"));
  if (!email || !code) return formError("Enter your email and the 6-digit code.");
  let destination: string;
  try {
    const profile = await verifySignupOtp({ email, code });
    const current = await getCurrentUser();
    if (current && current.id !== profile.id) {
      return formError("Sign out before verifying a different account.");
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    destination = current
      ? next
      : `/login?verified=1&email=${encodeURIComponent(email)}`;
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/auth] OTP verification failed", error);
    return formError("The code could not be verified. Request a new code.");
  }
  redirect(destination);
}

export async function resendVerificationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limit = await rateLimitByIp("auth:resend-verification", 3, 600);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  if (isDemoMode()) {
    const user = await getCurrentUser();
    if (!user) return formError("Sign in to verify your email.");
    const db = await getDb();
    await db.query(`update profiles set email_verified = true where id = $1`, [
      user.id,
    ]);
    return formSuccess("Email marked as verified (demo mode).");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return formError("Enter the email you signed up with.");
  if (isEmailConfigured()) {
    const profile = await getDb().then((db) =>
      db.query<{ id: string; username: string; emailVerified: boolean }>(
        `select id, username, email_verified as "emailVerified"
           from profiles where lower(email)=lower($1) limit 1`,
        [email],
      ),
    );
    const row = profile.rows[0];
    if (!row) {
      return formError("No account was found for that email.");
    }
    if (row.emailVerified) {
      return formSuccess("That email is already verified. You can sign in.");
    }
    const otp = await createAndSendSignupOtp({
      userId: row.id,
      email,
      name: row.username,
    });
    return otp.sent
      ? formSuccess("A new 6-digit verification code is on its way.")
      : formError(otp.reason ?? "The verification email could not be sent.");
  }
  if (!isSupabaseAuthConfigured()) {
    return formError("Authentication is not configured.");
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return formError("Authentication is not configured.");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return formError(mapSupabaseAuthError(error.message));
  return formSuccess("Verification email sent. Check your inbox.");
}

export async function onboardingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.status === "frozen") redirect("/reactivate");
  if (user.onboardingComplete) {
    redirect(user.role === "customer" ? "/dashboard" : "/admin");
  }

  const parsed = onboardingSchema.safeParse({
    useCase: formData.get("useCase"),
    username: formData.get("username") || undefined,
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return formError("Choose how you will use proxies.", zodFieldErrors(parsed.error));
  }

  const needsUsername = /^user_[a-f0-9]{10}$/i.test(user.username);
  const chosenUsername = parsed.data.username?.trim();
  if (needsUsername && !chosenUsername) {
    return formError("Choose a username before continuing.", {
      username: "Choose a username.",
    });
  }

  const finalUsername = needsUsername && chosenUsername ? chosenUsername : user.username;
  const db = await getDb();
  if (finalUsername.toLowerCase() !== user.username.toLowerCase()) {
    const taken = await db.query(
      `select 1 from profiles where lower(username) = lower($1) and id <> $2 limit 1`,
      [finalUsername, user.id],
    );
    if (taken.rows.length > 0) {
      return formError("That username is already taken.", {
        username: "That username is already taken.",
      });
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.query(
        `update profiles
            set username = $1,
                proxy_use_case = $2,
                onboarding_complete = true,
                onboarding_completed_at = now(),
                updated_at = now()
          where id = $3`,
        [finalUsername, parsed.data.useCase, user.id],
      );
      const meta = await getRequestMeta();
      await writeAuditLog(tx, {
        actorUserId: user.id,
        actorRole: user.role,
        action: "profile.onboarding_completed",
        entityType: "profile",
        entityId: user.id,
        metadata: { useCase: parsed.data.useCase },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return formError("That username is already taken.", {
        username: "That username is already taken.",
      });
    }
    console.error("[buybiz/auth] onboarding failed", error);
    return formError("We could not save your setup. Please try again.");
  }

  const fallback = user.role === "customer" ? "/dashboard" : "/admin";
  redirect(safeNextPath(parsed.data.next, fallback));
}

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const limit = await rateLimitByIp("profile:update", 12, 300);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName") ?? "",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const db = await getDb();
  if (parsed.data.username.toLowerCase() !== user.username.toLowerCase()) {
    const taken = await db.query(
      `select 1 from profiles where lower(username) = lower($1) and id <> $2 limit 1`,
      [parsed.data.username, user.id],
    );
    if (taken.rows.length > 0) {
      return formError("That username is already taken.", {
        username: "That username is already taken.",
      });
    }
  }

  const meta = await getRequestMeta();
  await db.transaction(async (tx) => {
    await tx.query(
      `update profiles set username = $1, display_name = $2, updated_at = now() where id = $3`,
      [
        parsed.data.username,
        parsed.data.displayName?.trim() || null,
        user.id,
      ],
    );
    await writeAuditLog(tx, {
      actorUserId: user.id,
      actorRole: user.role,
      action: "profile.updated",
      entityType: "profile",
      entityId: user.id,
      metadata: { usernameChanged: parsed.data.username !== user.username },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return formSuccess("Profile updated.");
}

export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const limit = await rateLimitByIp("profile:change-password", 6, 900);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  try {
    if (isDemoMode()) {
      const db = await getDb();
      const row = await db.query<{ passwordHash: string }>(
        `select password_hash as "passwordHash" from demo_credentials where user_id = $1 limit 1`,
        [user.id],
      );
      if (!row.rows[0] || !verifyPassword(parsed.data.currentPassword, row.rows[0].passwordHash)) {
        return formError("Your current password is incorrect.", {
          currentPassword: "Your current password is incorrect.",
        });
      }
      await db.query(
        `update demo_credentials set password_hash = $1 where user_id = $2`,
        [hashPassword(parsed.data.newPassword), user.id],
      );
      return formSuccess("Password updated.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) return formError("Authentication is not configured.");
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (error) return formError(mapSupabaseAuthError(error.message));
    return formSuccess("Password updated.");
  } catch (error) {
    console.error("[buybiz/auth] change password failed", error);
    return formError(toUserMessage(error));
  }
}

export async function logoutAction() {
  if (isDemoMode()) {
    await clearDemoSessionCookie();
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  redirect("/");
}

export async function oauthAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const provider = String(formData.get("provider") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/dashboard"));
  const referralCode = String(formData.get("referralCode") ?? "").trim().toUpperCase();
  if (referralCode) {
    if (!/^[A-Z0-9]{4,24}$/.test(referralCode)) {
      return formError("That referral code is not valid.");
    }
    const cookieStore = await cookies();
    cookieStore.set("buybiz_pending_referral", referralCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30,
    });
  }
  if (provider !== "google") {
    return formError("Unsupported sign-in provider.");
  }
  if (isDemoMode() || !isSupabaseAuthConfigured()) {
    return formError(
      "Google sign-in requires Supabase OAuth credentials. Configure the provider in Supabase and enable the Google flag in this deployment.",
    );
  }
  const limit = await rateLimitByIp("auth:oauth", 12, 300);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return formError("Authentication is not configured.");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    console.error("[buybiz/auth] oauth init failed", error?.message);
    return formError("We could not start social sign-in. Please try again.");
  }
  redirect(data.url);
}
