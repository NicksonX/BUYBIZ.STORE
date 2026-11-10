import { Landmark, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminExpenses, getInventoryOptions } from "@/server/data/admin";
import { createExpenseAction } from "@/server/actions/admin";
import { formatDate, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function todayLagos() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const categories = [
  ["proxy_purchase", "Proxy purchase"],
  ["infrastructure", "Infrastructure / hosting"],
  ["software", "Software"],
  ["marketing", "Marketing"],
  ["support", "Support"],
  ["other", "Other"],
];

export default async function AdminExpensesPage() {
  await requireAdminPage();
  const [expenses, inventory] = await Promise.all([
    getAdminExpenses(),
    getInventoryOptions(),
  ]);
  const total = expenses.reduce((sum, expense) => sum + expense.amountMinor, 0);
  const byCategory = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amountMinor;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        description="Record operating costs and proxy acquisition costs so profit estimates have a real basis."
      />

      <div className="mt-4 grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="surface-card rounded-[14px] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
              <Plus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[12px] font-semibold">Record an expense</h2>
              <p className="text-[9px] text-muted-foreground">Added to the selected date, not today by default.</p>
            </div>
          </div>
          <div className="mt-4">
            <AdminActionForm
              action={createExpenseAction}
              submitLabel="Save expense"
              pendingLabel="Saving…"
              confirmMessage="Record this expense?"
            >
              <AdminField label="Description" htmlFor="expense-description">
                <Input id="expense-description" name="description" required maxLength={160} placeholder="Proxy acquisition, hosting, domain" />
              </AdminField>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Category" htmlFor="expense-category">
                  <Select id="expense-category" name="category" defaultValue="proxy_purchase">
                    {categories.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </AdminField>
                <AdminField label="Amount (NGN)" htmlFor="expense-amount">
                  <Input id="expense-amount" name="amount" inputMode="decimal" required placeholder="18000" />
                </AdminField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Expense date" htmlFor="expense-date">
                  <Input id="expense-date" name="expenseDate" type="date" required defaultValue={todayLagos()} />
                </AdminField>
                <AdminField label="Linked inventory" htmlFor="expense-inventory" hint="Optional">
                  <Select id="expense-inventory" name="proxyInventoryId" defaultValue="">
                    <option value="">No linked proxy</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </Select>
                </AdminField>
              </div>
              <AdminField label="Notes" htmlFor="expense-notes" hint="Optional">
                <Textarea id="expense-notes" name="notes" className="min-h-16 text-[11px]" placeholder="Invoice reference or context" />
              </AdminField>
            </AdminActionForm>
          </div>
        </section>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="surface-card rounded-[12px] p-3.5">
              <p className="text-[9.5px] text-muted-foreground">Total recorded</p>
              <p className="tabular mt-2 text-[20px] font-semibold">{formatNaira(total, { exact: true })}</p>
            </div>
            <div className="surface-card rounded-[12px] p-3.5">
              <p className="text-[9.5px] text-muted-foreground">Entries</p>
              <p className="tabular mt-2 text-[20px] font-semibold">{expenses.length}</p>
            </div>
          </div>
          <div className="surface-card rounded-[13px] p-4">
            <h2 className="text-[11px] font-semibold">By category</h2>
            <div className="mt-2 space-y-1.5">
              {Object.entries(byCategory).length === 0 ? (
                <p className="text-[9.5px] text-muted-foreground">No expenses recorded.</p>
              ) : (
                Object.entries(byCategory).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between text-[9.5px]">
                    <span className="text-muted-foreground">{categories.find(([value]) => value === category)?.[1] ?? category}</span>
                    <span className="tabular">{formatNaira(amount, { exact: true })}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <AdminNote>
            Proxy acquisition costs recorded on inventory items are used in the
            direct-cost estimate. Expenses here are operating costs. Do not enter
            the same cost twice.
          </AdminNote>
        </div>
      </div>

      <section className="surface-card mt-4 overflow-hidden rounded-[14px]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[12px] font-semibold">Expense records</h2>
        </div>
        {expenses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-subtle/60">
                  {["Date", "Description", "Category", "Amount", "Linked proxy", "Recorded by", "Notes"].map((label) => (
                    <th key={label} className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDate(expense.expenseDate)}</td>
                    <td className="px-4 py-2.5 text-[10px] font-medium">{expense.description}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone="neutral">
                        {categories.find(([value]) => value === expense.category)?.[1] ?? expense.category}
                      </Badge>
                    </td>
                    <td className="tabular px-4 py-2.5 text-[10px] font-semibold">{formatNaira(expense.amountMinor, { exact: true })}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{expense.proxyLabel ?? "None"}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{expense.createdByName ?? "System"}</td>
                    <td className="max-w-[220px] px-4 py-2.5 text-[9px] text-muted-foreground">{expense.notes ?? "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-[10px] text-muted-foreground">No expenses recorded.</p>
        )}
      </section>
    </div>
  );
}
