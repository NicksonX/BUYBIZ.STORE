import "server-only";
import { getDb } from "@/lib/db";
import type { AppSettings } from "@/lib/db/types";

const DEFAULTS: AppSettings = {
  inventoryDefaultMaxSeats: 10,
  allocationSafetyBufferSeconds: 3600,
  stockExpiryDefaultDays: 30,
  depositMinMinor: 50_000,
  depositMaxMinor: 100_000_000,
  maintenanceMode: false,
  supportEmail: "",
  inventoryExpiryRemedy: "manual_review",
  paystackChannels: ["card", "bank", "ussd", "bank_transfer"],
  legalReviewRequired: true,
};

export async function getAppSettings(): Promise<AppSettings> {
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
      depositMinMinor: Math.max(1, num("deposit_min_minor", DEFAULTS.depositMinMinor)),
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
    };
  } catch (error) {
    console.error("[buybiz/settings] falling back to defaults", error);
    return DEFAULTS;
  }
}
