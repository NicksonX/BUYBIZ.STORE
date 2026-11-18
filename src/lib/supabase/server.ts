import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient(options?: { forwardIp?: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const forwardIp = options?.forwardIp?.trim();
  if (forwardIp && forwardIp !== "unknown") {
    // Supabase Auth uses sb-forwarded-for for trusted IP-based rate limiting.
    // Never accept this header from the browser; it is set server-side from
    // Vercel's trusted x-forwarded-for value.
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    ...(forwardIp && forwardIp !== "unknown"
      ? { global: { headers: { "sb-forwarded-for": forwardIp } } }
      : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components cannot write cookies. The proxy refreshes the
        // session and writes refreshed cookies on the response. Server Actions
        // and Route Handlers can write, where this succeeds.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Intentionally ignored in read-only server component rendering.
        }
      },
    },
  });
}
