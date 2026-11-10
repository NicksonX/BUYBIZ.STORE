import Link from "next/link";
import { FileWarning, Scale, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPage({
  kind,
  title,
  description,
  updated,
  sections,
}: {
  kind: "Terms" | "Privacy";
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="relative overflow-hidden bg-[#08090B] pb-12 pt-10 text-white sm:pb-16 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-20" />
        <div className="noise" />
        <div className="relative mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {kind === "Terms" ? (
              <Scale className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Legal · Draft
          </p>
          <h1 className="mt-4 max-w-[720px] text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-[46px]">
            {title}
          </h1>
          <p className="mt-4 max-w-[640px] text-[12.5px] leading-6 text-white/45">
            {description}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#F3C267]/25 bg-[#F3C267]/[0.08] px-3 py-1.5 text-[9.5px] font-medium text-[#F3C267]">
            <FileWarning className="h-3 w-3" />
            Draft for legal review · updated {updated}
          </div>
        </div>
      </section>

      <section className="bg-[#F4F4F5] py-10 sm:py-16">
        <div className="mx-auto w-full max-w-[1000px] px-5 sm:px-8">
          <div className="mb-6 rounded-[10px] border border-[#946200]/20 bg-[#FDF4E3] px-4 py-3 text-[10px] leading-5 text-[#946200]">
            <strong className="font-semibold">Draft, not final.</strong> This{" "}
            {kind.toLowerCase()} document is a working draft provided for product
            transparency. It requires review by a qualified Nigerian legal
            practitioner before public launch. Nothing here should be read as
            legal advice or a final contractual offer.
          </div>

          <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-14">
            <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8C9097]">
                Contents
              </p>
              <nav aria-label={`${kind} contents`} className="mt-3 space-y-1.5">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-[10px] leading-4 text-[#6E7178] transition-colors hover:text-[#0A0B0D]"
                  >
                    {String(index + 1).padStart(2, "0")} · {section.title}
                  </a>
                ))}
              </nav>
              <div className="mt-6 rounded-[10px] border border-black/[0.06] bg-white p-3">
                <p className="text-[9px] leading-4 text-[#6E7178]">
                  Questions about this draft? Use the{" "}
                  <Link href="/contact" className="font-medium text-[#0A0B0D] underline">
                    contact form
                  </Link>
                  . Do not send sensitive identity documents by email.
                </p>
              </div>
            </aside>

            <article className="prose-buybiz min-w-0">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-normal text-[#8C9097]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </h2>
                  {section.content}
                </section>
              ))}
              <div className="mt-10 rounded-[12px] border border-black/[0.07] bg-white p-4 text-[10px] leading-5 text-[#6E7178]">
                This draft is not legal advice. BUYBIZ must obtain legal review
                before launch, including for wallet treatment, refunds, data
                protection, consumer rights, prohibited use and the limitations of
                shared proxy access.
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
