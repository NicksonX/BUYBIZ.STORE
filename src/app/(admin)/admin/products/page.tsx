import { Boxes, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminProducts } from "@/server/data/admin";
import { updateProductAction } from "@/server/actions/admin";
import { formatDuration, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminPage();
  const products = await getAdminProducts();
  const live = products.filter((product) => !product.isComingSoon);
  const comingSoon = products.filter((product) => product.isComingSoon);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Products and pricing"
        description="Prices are read from the database at checkout. Every change is audited and takes effect immediately."
      />

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {live.map((product) => (
          <section key={product.id} className="surface-card rounded-[14px] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-semibold">{product.name}</h2>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  {product.slug} · {formatDuration(product.durationSeconds)}
                </p>
              </div>
              <Badge tone={product.isActive ? "success" : "neutral"}>
                {product.isActive ? "Active" : "Hidden"}
              </Badge>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">{product.description}</p>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[9px] text-muted-foreground">Current price</span>
              <span className="tabular text-[13px] font-semibold">{formatNaira(product.priceMinor)}</span>
            </div>
            <div className="mt-3">
              <AdminActionForm
                action={updateProductAction}
                hidden={{ productId: product.id }}
                submitLabel="Save price"
                pendingLabel="Saving…"
                confirmMessage="Update this product's price and visibility?"
                compact
              >
                <div className="grid grid-cols-2 gap-2">
                  <AdminField label="Price (NGN)" htmlFor={`price-${product.id}`}>
                    <Input id={`price-${product.id}`} name="price" inputMode="decimal" defaultValue={(product.priceMinor / 100).toString()} className="h-8 text-[11px]" />
                  </AdminField>
                  <AdminField label="Visibility" htmlFor={`active-${product.id}`}>
                    <Select id={`active-${product.id}`} name="isActive" defaultValue={String(product.isActive)} className="h-8 text-[11px]">
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </Select>
                  </AdminField>
                </div>
              </AdminActionForm>
            </div>
          </section>
        ))}
      </div>

      <section className="surface-card mt-4 rounded-[14px] p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
            <LockKeyhole className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-[12px] font-semibold">Coming-soon services</h2>
            <p className="text-[9px] text-muted-foreground">
              These are not purchasable. They cannot be activated from this page.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {comingSoon.map((product) => (
            <div key={product.id} className="rounded-[10px] border border-border bg-surface-subtle p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium">{product.name}</p>
                <Badge tone="neutral">Coming soon</Badge>
              </div>
              <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">{product.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-3">
        <AdminNote>
          Launch prices are ₦500, ₦1,000 and ₦3,000 unless an admin changes them.
          A price change affects every new purchase, never an existing allocation.
          Do not edit prices to test the payment flow; use the Paystack test mode
          instead.
        </AdminNote>
      </div>
    </div>
  );
}
