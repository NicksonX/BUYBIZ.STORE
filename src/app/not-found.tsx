import Link from "next/link";
import { ArrowRight, Compass, LayoutDashboard, SearchX } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#08090B] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_0%,rgba(255,255,255,0.11),transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full border border-white/[0.06]" />
      <div className="relative mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="BUYBIZ home">
            <Logo tone="onDark" size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Back to site <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <div className="flex flex-1 items-center py-16 sm:py-20">
          <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                <Compass className="h-3.5 w-3.5" /> 404 / Off the map
              </p>
              <h1 className="mt-4 max-w-[620px] text-[42px] font-semibold leading-[0.98] tracking-[-0.06em] sm:text-[64px] lg:text-[76px]">
                This page is not on the shelf.
              </h1>
              <p className="mt-5 max-w-[480px] text-[13px] leading-6 text-white/45 sm:text-[14px]">
                The address may be wrong, or the page may have moved. Your wallet
                and any active proxy access are unaffected.
              </p>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[11.5px] font-semibold text-[#0A0B0D] hover:bg-white/90"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> Go to dashboard
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-[11.5px] font-medium text-white/75 hover:bg-white/[0.06] hover:text-white"
                >
                  Return home
                </Link>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/[0.09] bg-white/[0.035] p-5 sm:p-6">
              <SearchX className="h-7 w-7 text-white/30" />
              <p className="mt-5 text-[13px] font-medium">Helpful next steps</p>
              <div className="mt-3 space-y-2.5 text-[11px] leading-5 text-white/40">
                <p>Check the address for a typo.</p>
                <p>Open your dashboard to reach proxies, orders and your wallet.</p>
                <p>Still stuck? Contact support from your dashboard.</p>
              </div>
              <div className="mt-5 border-t border-white/[0.08] pt-4 text-[9px] uppercase tracking-[0.12em] text-white/25">
                BUYBIZ digital marketplace
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
