import "server-only";
import { getDb } from "@/lib/db";
import { countryName, PRIMARY_COUNTRIES } from "@/lib/ai/countries";

export type InventoryCountry = {
  code: string;
  name: string;
  available: number;
  total: number;
};

export async function getInventoryCountries(): Promise<InventoryCountry[]> {
  const db = await getDb();
  const result = await db.query<{ code: string; available: number; total: number }>(
    `select country_code as code,
            count(*) filter (where status = 'available')::int as available,
            count(*)::int as total
       from proxy_inventory
      where archived_at is null and country_code is not null
      group by country_code
      order by country_code`,
  );
  const rows = result.rows.map((row) => ({
    code: row.code,
    name: countryName(row.code),
    available: Number(row.available),
    total: Number(row.total),
  }));
  const order = new Map<string, number>(
    PRIMARY_COUNTRIES.map((code, index) => [code as string, index]),
  );
  return rows.sort(
    (left, right) =>
      (order.get(left.code) ?? 99) - (order.get(right.code) ?? 99) ||
      left.name.localeCompare(right.name),
  );
}
