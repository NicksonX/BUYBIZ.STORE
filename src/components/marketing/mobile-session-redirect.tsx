"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * On phones, a signed-in visitor should land in their dashboard rather than
 * seeing marketing "Get started" screens. Desktop keeps the marketing site.
 */
export function MobileSessionRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => {
        if (!cancelled && data.authenticated) {
          router.replace("/dashboard");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
