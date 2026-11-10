import type { NextRequest } from "next/server";

/**
 * Build a trusted absolute origin for auth redirects. Prefer the configured
 * public app URL so a spoofed Host/X-Forwarded-Host header cannot redirect a
 * user (or their auth code) to an attacker-controlled origin.
 */
export function getTrustedOrigin(request?: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedHost && forwardedProto) {
      return `${forwardedProto}://${forwardedHost}`;
    }
    return request.nextUrl.origin;
  }
  return "http://localhost:3000";
}
