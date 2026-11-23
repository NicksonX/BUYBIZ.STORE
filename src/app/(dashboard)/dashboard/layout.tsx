import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { ThemeScope } from "@/components/theme/theme-provider";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireUserPage } from "@/server/auth/guards";
import { getDashboardCounts, getWalletSummary } from "@/server/data/customer";
import { getAmbassadorCampaign } from "@/server/services/ambassador";
import { getActiveDashboardAnnouncement } from "@/server/services/announcements";
import { getAppSettings } from "@/server/data/settings";
import { getSeasonOfRewardsPopupData } from "@/server/services/campaigns";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserPage();
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const theme =
    cookieStore.get("buybiz_customer_theme")?.value === "dark" ? "dark" : "light";
  const isMarketplace =
    headerStore.get("x-buybiz-pathname")?.startsWith("/dashboard/marketplace") ?? false;

  const [wallet, counts, ambassador, announcement, appSettings, seasonPopup] = await Promise.all([
    isMarketplace
      ? Promise.resolve({ balanceMinor: 0 })
      : getWalletSummary(user.id).catch(() => ({ balanceMinor: 0 })),
    getDashboardCounts(user.id).catch(() => ({ unreadNotifications: 0 })),
    getAmbassadorCampaign(user.id).catch(() => null),
    getActiveDashboardAnnouncement().catch(() => null),
    getAppSettings().catch(() => null),
    getSeasonOfRewardsPopupData().catch(() => null),
  ]);

  return (
    <ThemeScope
      defaultTheme={theme}
      cookieName="buybiz_customer_theme"
      className="min-h-dvh"
    >
      <DashboardShell
        user={user}
        balanceMinor={wallet.balanceMinor}
        unread={counts.unreadNotifications}
        ambassador={ambassador}
        announcement={announcement}
        proxyPurchasePaused={Boolean(appSettings?.proxyPurchasePaused)}
        seasonPopup={seasonPopup}
      >
        {children}
      </DashboardShell>
    </ThemeScope>
  );
}
