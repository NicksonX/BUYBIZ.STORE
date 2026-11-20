import { MaintenanceAnnouncement } from "@/components/dashboard/maintenance-announcement";
import { getActiveDashboardAnnouncement } from "@/server/services/announcements";
export const dynamic = "force-dynamic";
export default async function Preview() {
  const announcement = await getActiveDashboardAnnouncement();
  return <main className="min-h-dvh bg-[#F4F4F5] p-6"><h1 className="text-[22px] font-semibold">Dashboard preview</h1><p className="mt-2 text-[12px] text-muted-foreground">Temporary announcement verification page.</p><MaintenanceAnnouncement announcement={announcement} /></main>;
}
