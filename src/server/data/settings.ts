import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import type { AppSettings } from "@/lib/db/types";

const DEFAULTS: AppSettings = {
  inventoryDefaultMaxSeats: 15,
  referralMinProxyDurationDays: 7,
  allocationSafetyBufferSeconds: 3600,
  stockExpiryDefaultDays: 30,
  depositMinMinor: 250_000,
  depositScheduledMinMinor: 300_000,
  depositScheduledAt: "2026-11-20T00:00:00+01:00",
  depositMaxMinor: 100_000_000,
  maintenanceMode: false,
  supportEmail: "",
  inventoryExpiryRemedy: "manual_review",
  paystackChannels: ["card", "bank", "ussd", "bank_transfer"],
  legalReviewRequired: true,
  inactivityDays: 60,
  reactivationFeeMinor: 100_000,
  adminNotificationEmail: "",
  adminNotificationPhone: "",
  adminVoicePhone: "",
  adminNotificationChannels: ["in_app"],
  adminReminderTime: "08:00",
  adminTimezone: "Africa/Lagos",
};

export function computeDepositMinMinor(
  now: Date,
  rawMin: unknown,
  rawScheduledMinor: unknown,
  rawScheduledAt: unknown,
) {
  const number = (value: unknown, fallback: number) => {
    const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : fallback;
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const scheduledMinor = Math.max(250_000, number(rawScheduledMinor, 300_000));
  const scheduledRaw = typeof rawScheduledAt === "string" ? rawScheduledAt : "";
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;
  const scheduledDue = scheduledAt !== null && !Number.isNaN(scheduledAt.getTime()) && now.getTime() >= scheduledAt.getTime();
  return Math.max(250_000, scheduledDue ? scheduledMinor : number(rawMin, 250_000));
}

export const getAppSettings = cache(async (): Promise<AppSettings> => {
  try {
    const db = await getDb();
    const result = await db.query<{ key: string; value: unknown }>(
      `select key, value from app_settings`,
    );
    const map = new Map(result.rows.map((row) => [row.key, row.value]));
    const num = (key: string, fallback: number) => {
      const value = map.get(key);
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
      return fallback;
    };
    const bool = (key: string, fallback: boolean) => {
      const value = map.get(key);
      return typeof value === "boolean" ? value : fallback;
    };
    const str = (key: string, fallback: string) => {
      const value = map.get(key);
      return typeof value === "string" ? value : fallback;
    };
    const channels = map.get("paystack_channels");
    return {
      inventoryDefaultMaxSeats: Math.min(
        15,
        Math.max(1, num("inventory_default_max_seats", DEFAULTS.inventoryDefaultMaxSeats)),
      ),
      referralMinProxyDurationDays: Math.min(
        365,
        Math.max(
          1,
          Math.round(
            num(
              "referral_qualifying_proxy_duration_seconds",
              DEFAULTS.referralMinProxyDurationDays * 86_400,
            ) / 86_400,
          ),
        ),
      ),
      allocationSafetyBufferSeconds: Math.max(
        0,
        num("allocation_safety_buffer_seconds", DEFAULTS.allocationSafetyBufferSeconds),
      ),
      stockExpiryDefaultDays: Math.max(
        1,
        num("stock_expiry_default_days", DEFAULTS.stockExpiryDefaultDays),
      ),
      depositMinMinor: computeDepositMinMinor(
        new Date(),
        num("deposit_min_minor", DEFAULTS.depositMinMinor),
        num("deposit_scheduled_min_minor", DEFAULTS.depositScheduledMinMinor),
        str("deposit_scheduled_at", DEFAULTS.depositScheduledAt ?? ""),
      ),
      depositScheduledMinMinor: Math.max(250_000, num("deposit_scheduled_min_minor", DEFAULTS.depositScheduledMinMinor)),
      depositScheduledAt: str("deposit_scheduled_at", DEFAULTS.depositScheduledAt ?? ""),
      depositMaxMinor: Math.max(
        num("deposit_min_minor", DEFAULTS.depositMinMinor),
        num("deposit_max_minor", DEFAULTS.depositMaxMinor),
        DEFAULTS.depositMinMinor,
      ),
      maintenanceMode: bool("maintenance_mode", DEFAULTS.maintenanceMode),
      supportEmail: str("support_email", DEFAULTS.supportEmail),
      inventoryExpiryRemedy: str("inventory_expiry_remedy", DEFAULTS.inventoryExpiryRemedy),
      paystackChannels:
        Array.isArray(channels) && channels.every((c) => typeof c === "string")
          ? (channels as string[])
          : DEFAULTS.paystackChannels,
      legalReviewRequired: bool("legal_review_required", DEFAULTS.legalReviewRequired),
      inactivityDays: Math.min(3650, Math.max(1, num("inactivity_days", DEFAULTS.inactivityDays))),
      reactivationFeeMinor: Math.max(0, num("reactivation_fee_minor", DEFAULTS.reactivationFeeMinor)),
      adminNotificationEmail: str("admin_notification_email", DEFAULTS.adminNotificationEmail),
      adminNotificationPhone: str("admin_notification_phone", DEFAULTS.adminNotificationPhone),
      adminVoicePhone: str("admin_voice_phone", DEFAULTS.adminVoicePhone),
      adminNotificationChannels:
        Array.isArray(map.get("admin_notification_channels")) &&
        (map.get("admin_notification_channels") as unknown[]).every((item) => typeof item === "string")
          ? (map.get("admin_notification_channels") as string[])
          : DEFAULTS.adminNotificationChannels,
      adminReminderTime: str("admin_reminder_time", DEFAULTS.adminReminderTime),
      adminTimezone: str("admin_timezone", DEFAULTS.adminTimezone),
    };
  } catch (error) {
    console.error("[buybiz/settings] falling back to defaults", error);
    return DEFAULTS;
  }
});
