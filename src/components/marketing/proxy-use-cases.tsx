import { BriefcaseBusiness, Globe2, MousePointerClick, ScanSearch, ShoppingBag, Users2 } from "lucide-react";

const useCases = [
  { icon: Globe2, title: "Regional browsing", copy: "Access websites and online services available in the proxy location, subject to that service's availability and terms." },
  { icon: ScanSearch, title: "Website testing and localization", copy: "Check how websites look, load and behave from supported locations." },
  { icon: BriefcaseBusiness, title: "Business research", copy: "Support legitimate research workflows that need a particular regional IP." },
  { icon: ShoppingBag, title: "Supported platform access", copy: "Use regional access with services such as PayPal only where their terms, account region and verification rules permit." },
  { icon: Users2, title: "Survey participation", copy: "Use a proxy for surveys only where the provider expressly permits proxies and you genuinely qualify." },
  { icon: MousePointerClick, title: "Not a bypass", copy: "A proxy never bypasses KYC, identity checks, fraud controls, bans or platform terms. Each service applies its own rules." },
];

export function ProxyUseCases() {
  return (
    <section className="marketing-light-section bg-white py-10 dark:bg-[#0B0C0F] sm:py-14">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C9097]">What can you use a proxy for?</p>
            <h2 className="mt-2 text-[26px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#0A0B0D] dark:text-white sm:text-[34px]">Legitimate ways to use your proxy.</h2>
          </div>
        </div>
        <div className="home-stagger mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item) => (
            <div key={item.title} className="rounded-[13px] border border-black/[0.06] bg-[#FAFAFB] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-black/[0.06] bg-white text-[#0A0B0D] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><item.icon className="h-4 w-4" strokeWidth={1.7} /></span>
              <h3 className="mt-3 text-[12px] font-semibold text-[#0A0B0D] dark:text-white">{item.title}</h3>
              <p className="mt-1 text-[10.5px] leading-[1.6] text-[#6E7178] dark:text-white/50">{item.copy}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[9.5px] leading-4 text-[#8C9097]">BUYBIZ cannot guarantee access to PayPal, surveys or any third-party service. Each platform sets its own rules, verification and restrictions.</p>
      </div>
    </section>
  );
}
