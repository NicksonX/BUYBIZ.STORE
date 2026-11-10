import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

type PendingCookie = { name: string; value: string; options: CookieOptions };

/**
 * Auth callback helper. Accumulates the Supabase session cookies and required
 * no-store headers so they can be applied to the final redirect response.
 */
export function createSupabaseCallbackClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) pendingCookies.push(cookie);
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  function apply(response: NextResponse) {
    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    for (const [header, value] of Object.entries(pendingHeaders)) {
      response.headers.set(header, value);
    }
    return response;
  }

  return { client, apply };
}
