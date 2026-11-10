import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * Responsibilities:
 *  - refresh the Supabase Auth session cookie using the current SSR API;
 *  - expose the request pathname to server components for safe post-login
 *    redirects;
 *  - ensure private sections are never cached by a CDN.
 *
 * It deliberately does not perform authorization decisions. Every protected
 * layout, page, Server Action and Route Handler verifies the user itself.
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-buybiz-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const demo = process.env.DEMO_MODE === "true";

  if (url && key && !demo) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([header, value]) =>
            response.headers.set(header, value),
          );
        },
      },
    });

    // Validates/refreshes the session. getSession() must not be trusted for
    // authorization; server components call getUser() through the DAL.
    await supabase.auth.getClaims().catch(() => undefined);
  }

  if (
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin")
  ) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
