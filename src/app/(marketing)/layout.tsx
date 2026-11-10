import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getCurrentUser } from "@/server/auth/session";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAuthenticated = false;
  try {
    isAuthenticated = Boolean(await getCurrentUser());
  } catch (error) {
    console.error("[buybiz/marketing] session read failed", error);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F4F4F5]">
      <SiteHeader isAuthenticated={isAuthenticated} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
