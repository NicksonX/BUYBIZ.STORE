import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeScope } from "@/components/theme/theme-provider";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireUserPage } from "@/server/auth/guards";
import { getDashboardCounts, getWalletSummary } from "@/server/data/customer";

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
  const cookieStore = await cookies();
  const theme =
    cookieStore.get("buybiz_customer_theme")?.value === "dark" ? "dark" : "light";

  const [wallet, counts] = await Promise.all([
    getWalletSummary(user.id).catch(() => ({ balanceMinor: 0 })),
    getDashboardCounts(user.id).catch(() => ({ unreadNotifications: 0 })),
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
      >
        {children}
      </DashboardShell>
    </ThemeScope>
  );
}
