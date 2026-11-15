import { Bot, Boxes, Globe2, PackageCheck, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/server/auth/guards";
import { getDb } from "@/lib/db";
import { allCountries, countryFlag, countryName } from "@/lib/ai/countries";
import { ProxyAiWorkspace } from "@/components/admin/proxy-ai-workspace";

export const dynamic = "force-dynamic";

export default async function AdminAiProxyPage() {
  await requireAdminPage();
  const db = await getDb();
  const [products, batches, totals, byCountry] = await Promise.all([
    db.query<{ slug: string; name: string; accessType: string }>(
      `select slug, name, access_type as "accessType" from products
        where category='proxy' and is_active=true and is_coming_soon=false
        order by sort_order asc`,
    ),
    db.query<{ id: string; countryCode: string; total: number; verified: number; saved: number; createdAt: string; status: string }>(
      `select id, expected_country_code as "countryCode", total_entries as total,
              verified_entries as verified, saved_entries as saved,
              to_char(created_at, 'DD Mon YYYY HH24:MI') as "createdAt", status
         from proxy_import_batches order by created_at desc limit 15`,
    ),
    db.query<{ total: number; available: number; assigned: number; unavailable: number }>(
      `select count(*)::int as total,
              count(*) filter (where status='available')::int as available,
              (select count(*)::int from proxy_allocations where status='active' and expires_at>now()) as assigned,
              count(*) filter (where status in ('disabled','paused','expired'))::int as unavailable
         from proxy_inventory where archived_at is null`,
    ),
    db.query<{ code: string; total: number; available: number }>(
      `select country_code as code, count(*)::int as total,
              count(*) filter (where status='available')::int as available
         from proxy_inventory where archived_at is null and country_code is not null
         group by country_code order by country_code`,
    ),
  ]);
  const stats = totals.rows[0] ?? { total: 0, available: 0, assigned: 0, unavailable: 0 };

  return (
    <div>
      <PageHeader
        eyebrow="AI operations"
        title="AI Proxy Assistant"
        description="Paste proxy credentials, verify them, detect the real country and save only working inventory."
        actions={<Badge tone="success"><ShieldCheck className="mr-1 h-3 w-3" /> Admin only</Badge>}
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { label: "Total inventory", value: stats.total, icon: Boxes },
          { label: "Available", value: stats.available, icon: PackageCheck },
          { label: "Assigned", value: stats.assigned, icon: Globe2 },
          { label: "Unavailable", value: stats.unavailable, icon: Bot },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[11px] p-3.5">
            <div className="flex items-center justify-between"><p className="text-[9px] text-muted-foreground">{item.label}</p><item.icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <p className="tabular mt-1.5 text-[20px] font-semibold leading-none">{item.value}</p>
          </div>
        ))}
      </div>

      {byCountry.rows.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {byCountry.rows.map((row) => (
            <span key={row.code} className="rounded-full border border-border bg-surface px-3 py-1.5 text-[9.5px]">
              {countryFlag(row.code)} {countryName(row.code)} · <strong>{row.available}</strong> / {row.total} available
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        <ProxyAiWorkspace
          countries={allCountries()}
          products={products.rows}
          batches={batches.rows}
        />
      </div>

      <p className="mt-4 text-[9px] leading-4 text-muted-foreground">
        Credentials are encrypted before storage and never returned to the browser. Verification uses a fixed destination and blocks private/internal proxy hosts. Country mismatches are held for review and are not saved automatically.
      </p>
    </div>
  );
}
