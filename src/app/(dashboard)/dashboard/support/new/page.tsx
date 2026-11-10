import Link from "next/link";
import { ArrowLeft, CircleHelp, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { NewTicketForm } from "@/components/support/new-ticket-form";

export const dynamic = "force-dynamic";

export default function NewSupportTicketPage() {
  return (
    <div>
      <PageHeader
        backHref="/dashboard/support"
        backLabel="Back to support"
        eyebrow="New ticket"
        title="How can we help?"
        description="Give us enough detail to investigate without sharing secrets."
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="surface-card rounded-[15px] p-5">
          <NewTicketForm />
        </section>

        <div className="space-y-3">
          <section className="surface-card rounded-[14px] p-4">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
              <CircleHelp className="h-3.5 w-3.5" /> Helpful details
            </h2>
            <ul className="mt-3 space-y-2 text-[9.5px] leading-4 text-muted-foreground">
              <li>Order number (for example BZ-…)</li>
              <li>The exact error message you see</li>
              <li>Whether your allocation still shows as active</li>
              <li>Your device, client and operating system</li>
              <li>What you have already tried</li>
            </ul>
          </section>

          <section className="rounded-[12px] border border-warning/20 bg-warning-soft p-3.5">
            <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold text-warning">
              <ShieldCheck className="h-3.5 w-3.5" /> Never share
            </h2>
            <p className="mt-1 text-[9px] leading-4 text-warning/80">
              Your password, Paystack secret keys, full card numbers or the
              security answers to your email account. Support does not need
              them.
            </p>
          </section>

          <Link
            href="/dashboard/support"
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-[10.5px] font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
