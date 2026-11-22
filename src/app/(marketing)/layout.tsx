import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { MobileSessionRedirect } from "@/components/marketing/mobile-session-redirect";
import { RouteTransition } from "@/components/ui/route-transition";
import { MarketingReveal } from "@/components/marketing/scroll-reveal";
import { GiveawayProofPopup } from "@/components/marketing/giveaway-proof-popup";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F4F4F5] text-[#0A0B0D]">
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('reveal-ready')",
        }}
      />
      <MobileSessionRedirect />
      <MarketingReveal />
      <SiteHeader />
      <main id="main" className="flex-1">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <SiteFooter />
      <GiveawayProofPopup />
    </div>
  );
}
