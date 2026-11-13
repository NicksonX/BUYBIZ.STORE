import Link from "next/link";
import { ArrowUpRight, Check, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function AuthVisual() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#08090B] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-25" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-white/[0.06] blur-[110px]" />
      <div className="noise" />

      <div className="relative">
        <Logo tone="onDark" size="md" />
      </div>

      <div className="relative mx-auto w-full max-w-[400px]">
        <div className="mb-10">
          <h2 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] xl:text-[38px]">
            Your wallet and
            <br />
            proxies in one place.
          </h2>
          <p className="mt-4 text-[12.5px] leading-6 text-white/60">
            Fund your balance, choose a proxy plan and keep every purchase,
            refund and expiry in one clear place.
          </p>
        </div>

        <div className="relative rounded-[18px] border border-white/[0.1] bg-white/[0.035] p-4 shadow-[0_40px_80px_-40px_rgba(0,0,0,1)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-white/10 bg-white/[0.06]">
                <Wallet className="h-3.5 w-3.5 text-white/70" />
              </span>
              <div>
                <p className="text-[10px] text-white/55">NGN wallet</p>
                <p className="mt-0.5 text-[13px] font-medium tracking-[-0.01em] text-white/80">
                  Ready to fund
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3">
            {[
              { label: "Deposit verified server-side", status: "Credited" },
              { label: "Proxy plan purchased", status: "Active" },
              { label: "No-stock safeguard", status: "Refunded" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[10.5px]">
                <span className="flex items-center gap-2 text-white/60">
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                  {row.label}
                </span>
                <span className="text-[#8EE7B8]">{row.status}</span>
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-7 space-y-3">
          {[
            "Server-verified wallet credits",
            "Immutable transaction ledger",
            "Shared proxy terms stated plainly",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[11.5px] text-white/60">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Check className="h-2.5 w-2.5 text-[#8EE7B8]" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center justify-end border-t border-white/[0.07] pt-5">
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-1 text-[10px] text-white/55 hover:text-white/80"
        >
          How it works <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
