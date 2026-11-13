import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import type { AppSettings } from "@/lib/db/types";

const DEFAULTS: AppSettings = {
  inventoryDefaultMaxSeats: 10,
  allocationSafetyBufferSeconds: 3600,
  stockExpiryDefaultDays: 30,
  depositMinMinor: 300_000,
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
        10,
        Math.max(1, num("inventory_default_max_seats", DEFAULTS.inventoryDefaultMaxSeats)),
      ),
      allocationSafetyBufferSeconds: Math.max(
        0,
        num("allocation_safety_buffer_seconds", DEFAULTS.allocationSafetyBufferSeconds),
      ),
      stockExpiryDefaultDays: Math.max(
        1,
        num("stock_expiry_default_days", DEFAULTS.stockExpiryDefaultDays),
      ),
      depositMinMinor: Math.max(300_000, num("deposit_min_minor", DEFAULTS.depositMinMinor)),
      depositMaxMinor: Math.max(
        num("deposit_min_minor", DEFAULTS.depositMinMinor),
        num("deposit_max_minor", DEFAULTS.depositMaxMinor),
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
