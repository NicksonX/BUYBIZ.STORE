import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nairaWhole = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const nairaExact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format integer kobo as NGN. Defaults to whole naira for plan prices. */
export function formatNaira(kobo: number, options?: { exact?: boolean }) {
  const naira = kobo / 100;
  return options?.exact ? nairaExact.format(naira) : nairaWhole.format(naira);
}

/** Format kobo with explicit sign, used by ledger rows. */
export function formatSignedNaira(kobo: number) {
  const sign = kobo > 0 ? "+" : kobo < 0 ? "−" : "";
  return `${sign}${formatNaira(Math.abs(kobo), { exact: true })}`;
}

export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const kobo = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) ? kobo : null;
}

const watDate = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

const watDateTime = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

const watShort = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value);
}

/** BUYBIZ operates on Nigerian time (WAT) for displayed timestamps. */
export function formatDate(value: Date | string | number | null | undefined) {
  if (!value) return "Not set";
  return watDate.format(toDate(value));
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
) {
  if (!value) return "Not set";
  return watDateTime.format(toDate(value));
}

export function formatShortDateTime(
  value: Date | string | number | null | undefined,
) {
  if (!value) return "Not set";
  return watShort.format(toDate(value));
}

export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  now = new Date(),
) {
  if (!value) return "Not set";
  const date = toDate(value);
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 3600_000],
    ["month", 30 * 24 * 3600_000],
    ["week", 7 * 24 * 3600_000],
    ["day", 24 * 3600_000],
    ["hour", 3600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function remainingParts(expiresAt: Date | string, now = new Date()) {
  const diff = Math.max(0, toDate(expiresAt).getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { totalSeconds, days, hours, minutes, expired: diff <= 0 };
}

export function formatRemaining(expiresAt: Date | string, now = new Date()) {
  const { days, hours, minutes, expired } = remainingParts(expiresAt, now);
  if (expired) return "Expired";
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "Not set";
  if (seconds % 86400 === 0) {
    const days = seconds / 86400;
    return days === 1 ? "24 hours" : `${days} days`;
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${Math.round(seconds / 60)} minutes`;
}

export function getInitials(name: string, email?: string) {
  const source = name?.trim() || email?.split("@")[0] || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function maskValue(value: string | null | undefined, visible = 2) {
  if (!value) return "Not required";
  if (value.length <= visible) return "•".repeat(Math.max(6, value.length));
  return `${"•".repeat(Math.min(14, value.length - visible))}${value.slice(-visible)}`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function safeNextPath(
  next: string | string[] | null | undefined,
  fallback = "/dashboard",
) {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/api/") || value.startsWith("/auth/")) return fallback;
  return value;
}

export function slugToTitle(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function firstName(displayName?: string | null, username?: string) {
  const source = displayName?.trim() || username || "there";
  return capitalize(source.split(/\s+/)[0]);
}

export function lagosGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function longDateLagos(now = new Date()) {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Lagos",
  }).format(now);
}
