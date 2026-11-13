import "server-only";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/lib/db";
import type { Profile } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDemoSessionUserId } from "@/server/auth/demo-cookie";

const PROFILE_COLUMNS = `
  id,
  username,
  email,
  display_name as "displayName",
  avatar_url as "avatarUrl",
  role,
  status,
  email_verified as "emailVerified",
  onboarding_complete as "onboardingComplete",
  proxy_use_case as "proxyUseCase",
  onboarding_completed_at as "onboardingCompletedAt",
  last_activity_at as "lastActivityAt",
  frozen_at as "frozenAt",
  freeze_reason as "freezeReason",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function getProfileById(id: string): Promise<Profile | null> {
  const db = await getDb();
  const result = await db.query<Profile>(
    `select ${PROFILE_COLUMNS} from profiles where id = $1 limit 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

function normalizeUsername(raw: string | undefined | null) {
  const value = raw?.trim();
  return value && /^[A-Za-z0-9_]{3,24}$/.test(value) ? value : null;
}

async function uniquePlaceholderUsername() {
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `user_${randomBytes(5).toString("hex")}`;
    const exists = await db.query(
      `select 1 from profiles where lower(username) = lower($1) limit 1`,
      [candidate],
    );
    if (exists.rows.length === 0) return candidate;
  }
  return `user_${randomBytes(10).toString("hex").slice(0, 20)}`;
}

/**
 * Ensure a Supabase Auth user has a BUYBIZ profile. The database trigger
 * normally creates this row atomically; this is a defensive fallback for
 * projects where the trigger has not been applied yet, and for OAuth users.
 */
export async function ensureProfileForAuthUser(user: User): Promise<Profile> {
  const existing = await getProfileById(user.id);
  if (existing) {
    const verified = Boolean(user.email_confirmed_at);
    if (existing.emailVerified !== verified && verified) {
      const db = await getDb();
      await db.query(
        `update profiles set email_verified = true, updated_at = now() where id = $1 and email_verified = false`,
        [user.id],
      );
    }
    return existing;
  }

  const db = await getDb();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const preferred = normalizeUsername(
    typeof meta.username === "string" ? meta.username : null,
  );
  const username = preferred ?? (await uniquePlaceholderUsername());
  const email = (user.email ?? `${user.id}@placeholder.invalid`).toLowerCase();
  const displayName =
    typeof meta.display_name === "string"
      ? meta.display_name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await db.query<Profile>(
        `insert into profiles
           (id, username, email, display_name, role, status, email_verified, onboarding_complete)
         values ($1,$2,$3,$4,'customer','active',$5,$6)
         on conflict (id) do update set updated_at = now()
         returning ${PROFILE_COLUMNS}`,
        [
          user.id,
          username,
          email,
          displayName,
          Boolean(user.email_confirmed_at),
          false,
        ],
      );
      if (result.rows[0]) return result.rows[0];
    } catch (error) {
      // Username collision: retry with a unique placeholder and onboarding.
      if ((error as { code?: string }).code === "23505") {
        const placeholder = await uniquePlaceholderUsername();
        const retry = await db.query<Profile>(
          `insert into profiles
             (id, username, email, display_name, role, status, email_verified, onboarding_complete)
           values ($1,$2,$3,$4,'customer','active',$5,false)
           on conflict (id) do nothing
           returning ${PROFILE_COLUMNS}`,
          [
            user.id,
            placeholder,
            email,
            displayName,
            Boolean(user.email_confirmed_at),
          ],
        );
        if (retry.rows[0]) return retry.rows[0];
        const again = await getProfileById(user.id);
        if (again) return again;
      } else {
        throw error;
      }
    }
  }

  throw new Error("Unable to create a profile for this account.");
}

/**
 * Data Access Layer session read. Always validates server-side; never trust
 * a client-supplied role or user_metadata for authorization.
 */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  if (process.env.DEMO_MODE === "true") {
    const userId = await getDemoSessionUserId();
    if (!userId) return null;
    return getProfileById(userId);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return ensureProfileForAuthUser(data.user);
});
