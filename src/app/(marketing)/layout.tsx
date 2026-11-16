import { cookies } from "next/headers";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { MobileSessionRedirect } from "@/components/marketing/mobile-session-redirect";
import { RouteTransition } from "@/components/ui/route-transition";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const marketingTheme =
    cookieStore.get("buybiz_marketing_theme")?.value === "dark" ? "dark" : "light";
  return (
    <div className="flex min-h-dvh flex-col bg-[#F4F4F5] text-[#0A0B0D]">
      <MobileSessionRedirect />
      <SiteHeader marketingTheme={marketingTheme} />
      <main id="main" className="flex-1">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
