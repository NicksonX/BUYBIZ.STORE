import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import type { PlanAvailability, Product } from "@/lib/db/types";
import { getAppSettings } from "@/server/data/settings";

const PRODUCT_COLUMNS = `
  id, slug, name, description, category,
  duration_seconds as "durationSeconds",
  price_minor as "priceMinor",
  currency,
  is_active as "isActive",
  is_coming_soon as "isComingSoon",
  features,
  sort_order as "sortOrder",
  access_type as "accessType",
  max_active_per_customer as "maxActivePerCustomer"
`;

function normalizeProduct(row: Product & { features: unknown }): Product {
  return {
    ...row,
    features: Array.isArray(row.features)
      ? row.features.filter((f): f is string => typeof f === "string")
      : [],
  };
}

export const getActiveProxyPlans = cache(async (): Promise<Product[]> => {
  const db = await getDb();
  const result = await db.query<Product>(
    `select ${PRODUCT_COLUMNS}
       from products
      where category = 'proxy' and is_active = true and is_coming_soon = false
      order by sort_order asc, price_minor asc`,
  );
  return result.rows.map(normalizeProduct);
});

export const getComingSoonProducts = cache(async (): Promise<Product[]> => {
  const db = await getDb();
  const result = await db.query<Product>(
    `select ${PRODUCT_COLUMNS}
       from products
      where is_coming_soon = true
      order by sort_order asc`,
  );
  return result.rows.map(normalizeProduct);
});

export const getAllProducts = cache(async (): Promise<Product[]> => {
  const db = await getDb();
  const result = await db.query<Product>(
    `select ${PRODUCT_COLUMNS} from products order by sort_order asc, price_minor asc`,
  );
  return result.rows.map(normalizeProduct);
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const db = await getDb();
  const result = await db.query<Product>(
    `select ${PRODUCT_COLUMNS} from products where slug = $1 limit 1`,
    [slug],
  );
  return result.rows[0] ? normalizeProduct(result.rows[0]) : null;
});

export const getPlanAvailability = cache(async (countryCode?: string): Promise<PlanAvailability[]> => {
  const db = await getDb();
  const settings = await getAppSettings();
  const plans = await getActiveProxyPlans();
  const buffer = settings.allocationSafetyBufferSeconds;

  const result = await db.query<PlanAvailability & { productId: string }>(
    `select p.id as "productId",
            p.id, p.slug, p.name, p.description, p.category,
            p.duration_seconds as "durationSeconds",
            p.price_minor as "priceMinor", p.currency,
            p.is_active as "isActive", p.is_coming_soon as "isComingSoon",
            p.features, p.sort_order as "sortOrder",
            p.access_type as "accessType",
            p.max_active_per_customer as "maxActivePerCustomer",
            coalesce(count(i.id), 0)::int as "eligibleInventory",
            coalesce(sum(greatest(i.max_seats - coalesce(s.active_seats, 0), 0)), 0)::int as "freeSeats"
       from products p
       left join proxy_inventory i
         on i.status = 'available'
        and i.access_type = p.access_type
        and i.archived_at is null
        and ($2::text is null or i.country_code = $2)
        and i.upstream_expires_at >= now() + (p.duration_seconds + $1::int) * interval '1 second'
       left join lateral (
         select count(*)::int as active_seats
           from proxy_allocations a
          where a.proxy_inventory_id = i.id
            and a.status = 'active'
            and a.expires_at > now()
       ) s on true
      where p.category = 'proxy' and p.is_active = true and p.is_coming_soon = false
      group by p.id
      order by p.sort_order asc`,
    [buffer, countryCode ?? null],
  );

  const byId = new Map(
    result.rows.map((row) => [
      row.productId,
      {
        eligibleInventory: Number(row.eligibleInventory),
        freeSeats: Number(row.freeSeats),
      },
    ]),
  );

  return plans.map((product) => {
    const availability = byId.get(product.id) ?? {
      eligibleInventory: 0,
      freeSeats: 0,
    };
    return {
      product,
      eligibleInventory: availability.eligibleInventory,
      freeSeats: availability.freeSeats,
      available: availability.freeSeats > 0,
    };
  });
});
