import "server-only";
import { cookies } from "next/headers";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/security/session-token";

export const DEMO_SESSION_COOKIE = "buybiz_demo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function cookieIsSecure() {
  return (
    process.env.NODE_ENV === "production" &&
    (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://")
  );
}

export async function setDemoSessionCookie(userId: string) {
  const token = await createSessionToken(userId, MAX_AGE_SECONDS);
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieIsSecure(),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearDemoSessionCookie() {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieIsSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function getDemoSessionUserId() {
  const store = await cookies();
  const token = store.get(DEMO_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}
