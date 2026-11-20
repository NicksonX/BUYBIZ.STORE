import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ThemeScope } from "@/components/theme/theme-provider";
import { AdminShell } from "@/components/admin/shell";
import { requireStaffPage } from "@/server/auth/guards";
import { getAdminBadgeCounts } from "@/server/data/admin";
import { getActiveDashboardAnnouncement } from "@/server/services/announcements";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffPage();
  const headerStore = await headers();
  const pathname = headerStore.get("x-buybiz-pathname") || "/admin";
  if (user.role === "support" && pathname === "/admin") {
    redirect("/admin/support");
  }

  const cookieStore = await cookies();
  const theme =
    cookieStore.get("buybiz_admin_theme")?.value === "light" ? "light" : "dark";
  const [counts, announcement] = await Promise.all([
    getAdminBadgeCounts().catch(() => ({ pendingDeposits: 0, openTickets: 0 })),
    getActiveDashboardAnnouncement().catch(() => null),
  ]);

  return (
    <ThemeScope
      defaultTheme={theme}
      cookieName="buybiz_admin_theme"
      className="min-h-dvh"
    >
      <AdminShell
        user={user}
        pendingDeposits={counts.pendingDeposits}
        openTickets={counts.openTickets}
        announcement={announcement}
      >
        {children}
      </AdminShell>
    </ThemeScope>
  );
}
