import { cookies } from "next/headers";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getCurrentUser } from "@/server/auth/session";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const marketingTheme =
    cookieStore.get("buybiz_marketing_theme")?.value === "dark" ? "dark" : "light";
  let isAuthenticated = false;
  try {
    isAuthenticated = Boolean(await getCurrentUser());
  } catch (error) {
    console.error("[buybiz/marketing] session read failed", error);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F4F4F5] text-[#0A0B0D]">
      <SiteHeader
        isAuthenticated={isAuthenticated}
        marketingTheme={marketingTheme}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
