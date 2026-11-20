import "server-only";
import { getDb } from "@/lib/db";

export type DashboardAnnouncement = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  publishedAt: string | null;
};

export async function getActiveDashboardAnnouncement(): Promise<DashboardAnnouncement | null> {
  const db = await getDb();
  const result = await db.query<{ value: unknown }>(
    `select value from app_settings where key='dashboard_announcement' limit 1`,
  );
  const raw = result.rows[0]?.value;
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.active !== true || typeof data.id !== "string" || typeof data.title !== "string" || typeof data.message !== "string") return null;
  const published = typeof data.publishedAt === "string" ? data.publishedAt : null;
  if (published && new Date(published).getTime() > Date.now()) return null;
  return {
    id: data.id.slice(0, 80),
    title: data.title.slice(0, 120),
    message: data.message.slice(0, 2000),
    active: true,
    publishedAt: published,
  };
}
