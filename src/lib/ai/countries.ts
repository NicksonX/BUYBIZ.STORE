import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

export type CountryOption = { code: string; name: string; flag: string; available: boolean; count: number };

export const PRIMARY_COUNTRIES = ["US", "GB", "CA", "AU"] as const;

export function countryName(code: string | null | undefined) {
  if (!code) return "Unknown";
  return countries.getName(code.toUpperCase(), "en") ?? code.toUpperCase();
}

export function countryFlag(code: string | null | undefined) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function allCountries(): Array<{ code: string; name: string }> {
  const names = countries.getNames("en", { select: "official" });
  return Object.entries(names)
    .map(([code, name]) => ({ code, name: String(name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countryCodeFromText(text: string) {
  const lower = text.toLowerCase();
  const names = countries.getNames("en", { select: "official" });
  for (const [code, name] of Object.entries(names)) {
    if (lower.includes(String(name).toLowerCase())) return code;
  }
  const aliases: Record<string, string> = {
    usa: "US", "united states": "US", america: "US",
    uk: "GB", britain: "GB", "great britain": "GB", england: "GB",
    canada: "CA", australia: "AU",
  };
  for (const [alias, code] of Object.entries(aliases)) {
    if (lower.includes(alias)) return code;
  }
  return null;
}
