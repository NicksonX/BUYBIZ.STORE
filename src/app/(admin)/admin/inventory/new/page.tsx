import { PageHeader } from "@/components/ui/page-header";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAppSettings } from "@/server/data/settings";
import { getPlanAvailability } from "@/server/data/products";
import { createInventoryAction } from "@/server/actions/admin";
import { allCountries } from "@/lib/ai/countries";

export const dynamic = "force-dynamic";

function defaultExpiry(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function NewInventoryPage() {
  await requireAdminPage();
  const [settings, plans] = await Promise.all([
    getAppSettings(),
    getPlanAvailability(),
  ]);
  const expiryDate = defaultExpiry(settings.stockExpiryDefaultDays);
  const countries = allCountries();

  return (
    <div>
      <PageHeader
        backHref="/admin/inventory"
        backLabel="Back to inventory"
        eyebrow="Admin"
        title="Add a proxy manually"
        description="Enter the upstream proxy details supplied by the provider. Credentials are encrypted before they reach the database."
      />

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="surface-card rounded-[14px] p-4 sm:p-5">
          <AdminActionForm
            action={createInventoryAction}
            submitLabel="Save proxy"
            pendingLabel="Encrypting and saving…"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Internal label" htmlFor="label">
                <Input id="label" name="label" required maxLength={80} placeholder="e.g. Lagos Datacenter 01" />
              </AdminField>
              <AdminField label="Country" htmlFor="countryCode">
                <Select id="countryCode" name="countryCode" defaultValue="US" required>
                  {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </Select>
              </AdminField>
              <AdminField label="Protocol" htmlFor="protocol">
                <Select id="protocol" name="protocol" defaultValue="socks5">
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </Select>
              </AdminField>
              <AdminField label="Verification" htmlFor="verificationStatus" hint="Only verified, available stock can be sold">
                <Select id="verificationStatus" name="verificationStatus" defaultValue="unverified">
                  <option value="unverified">Unverified</option>
                  <option value="verified">Verified by admin</option>
                  <option value="review_required">Review required</option>
                  <option value="failed">Failed</option>
                </Select>
              </AdminField>
              <AdminField label="Host / IP" htmlFor="host">
                <Input id="host" name="host" required placeholder="203.0.113.10" />
              </AdminField>
              <AdminField label="Port" htmlFor="port">
                <Input id="port" name="port" type="number" min={1} max={65535} required placeholder="1080" />
              </AdminField>
              <AdminField label="Proxy package" htmlFor="productSlug" hint="Inventory is never mixed across packages">
                <Select id="productSlug" name="productSlug" required defaultValue="proxy-24-hours">
                  {plans.map((plan) => (
                    <option key={plan.product.id} value={plan.product.slug}>
                      {plan.product.name} · ₦{(plan.product.priceMinor / 100).toLocaleString("en-NG")}
                    </option>
                  ))}
                </Select>
              </AdminField>
              <AdminField label="Credential group" htmlFor="credentialGroup" hint="A, B, C. Use a new group for a new upstream login.">
                <Input id="credentialGroup" name="credentialGroup" defaultValue="A" required maxLength={24} />
              </AdminField>
              <AdminField label="Region" htmlFor="region" hint="Optional">
                <Input id="region" name="region" placeholder="Nigeria" />
              </AdminField>
              <AdminField label="Purchase cost (NGN)" htmlFor="purchaseCost" hint="Optional, used for profit reports">
                <Input id="purchaseCost" name="purchaseCost" inputMode="decimal" placeholder="1800" />
              </AdminField>
            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <AdminField label="Upstream username" htmlFor="username" hint="Optional">
                <Input id="username" name="username" autoComplete="off" placeholder="Provider username" />
              </AdminField>
              <AdminField label="Upstream password" htmlFor="password" hint="Encrypted at rest">
                <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Provider password" />
              </AdminField>
            </div>
            <AdminNote tone="warning">
              If the provider uses one shared login, every allocated customer will
              receive these same credentials. Do not create fake per-customer
              usernames.
            </AdminNote>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <AdminField label="Proxy access" htmlFor="accessType" hint="Customer facing">
                <Select id="accessType" name="accessType" defaultValue="shared">
                  <option value="shared">Shared access</option>
                  <option value="single">Single customer (personal)</option>
                </Select>
              </AdminField>
              <AdminField label="Maximum seats" htmlFor="maxSeats" hint="Shared: 1-10. Single: always 1">
                <Input id="maxSeats" name="maxSeats" type="number" min={1} max={10} defaultValue={settings.inventoryDefaultMaxSeats} />
              </AdminField>
              <AdminField label="Upstream expiry" htmlFor="upstreamExpiry" hint="WAT">
                <Input id="upstreamExpiry" name="upstreamExpiry" type="date" required defaultValue={expiryDate} />
              </AdminField>
              <AdminField label="Expiry source" htmlFor="expiryIsEstimated">
                <Select id="expiryIsEstimated" name="expiryIsEstimated" defaultValue="true">
                  <option value="true">Assumed / manual</option>
                  <option value="false">Provider confirmed</option>
                </Select>
              </AdminField>
            </div>
            <AdminNote>
              A single-customer proxy always has one seat. It is used for the ₦5,000 Personal 30-Day Proxy and is never allocated to a shared plan.
            </AdminNote>

            <AdminField label="Provider note (private)" htmlFor="providerNote" hint="Optional">
              <Input id="providerNote" name="providerNote" placeholder="Provider, invoice or reference" />
            </AdminField>
            <AdminField label="Admin notes" htmlFor="adminNotes" hint="Optional">
              <Textarea id="adminNotes" name="adminNotes" className="min-h-20 text-[11px]" placeholder="Anything the next admin should know" />
            </AdminField>
          </AdminActionForm>
        </section>

        <aside className="space-y-3">
          <div className="surface-card rounded-[13px] p-4">
            <h2 className="text-[11px] font-semibold">Before saving</h2>
            <ul className="mt-2 space-y-2 text-[9.5px] leading-4 text-muted-foreground">
              <li>Confirm the host, port and protocol with the provider.</li>
              <li>Record the real expiry if the provider supplied one.</li>
              <li>Use an assumed expiry when you only know the upload date.</li>
              <li>Daily and weekly stock are separate categories and rotate manually.</li>
              <li>Customers are never shown your private provider note.</li>
              <li>Passwords are encrypted, never logged and not returned in list responses.</li>
            </ul>
          </div>
          <AdminNote tone="warning">
            A 30-day customer package can only be sold while the proxy has at
            least 30 days plus the configured safety buffer left. Plan expiry
            entry carefully.
          </AdminNote>
          <AdminNote>
            The uploaded timestamp is set by the server now. Backdating requires a
            privileged, audited correction and is not offered in this form.
          </AdminNote>
        </aside>
      </div>
    </div>
  );
}
