import { LogoMark } from "@/components/brand/logo";

export function SeasonRewardsArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className="season-art relative overflow-hidden bg-[linear-gradient(160deg,#04160F_0%,#0A3A26_58%,#0E5233_100%)] text-white">
      <div className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[#0E7A44]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-[#B98A2E]/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.08]" />
      <span className="season-coin pointer-events-none absolute right-[8%] top-[18%] h-9 w-9 rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFE9A8_0%,#E3B64A_45%,#8A5D12_100%)] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.7)]" />
      <span className="season-coin pointer-events-none absolute right-[22%] top-[52%] h-6 w-6 rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFE9A8_0%,#E3B64A_45%,#8A5D12_100%)] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)]" />
      <span className="season-coin pointer-events-none absolute left-[6%] top-[56%] h-5 w-5 rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFF3C4_0%,#D9A93E_50%,#7C4E0E_100%)]" />

      <div className={`relative flex items-center justify-between gap-4 px-5 ${compact ? "py-5 sm:px-8 sm:py-6" : "px-6 py-8 sm:px-10 sm:py-10"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LogoMark tone="onDark" className="h-6 w-6 rounded-[6px]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFE9A8]">BUYBIZ</span>
          </div>
          <h2 className={`mt-3 font-semibold leading-[0.95] tracking-[-0.055em] ${compact ? "text-[26px] sm:text-[34px]" : "text-[34px] sm:text-[44px]"}`}>
            <span className="text-[#FFF6D8]">Season</span>{" "}
            <span className="bg-[linear-gradient(100deg,#FFE9A8_10%,#E3B64A_50%,#FFE9A8_90%)] bg-clip-text text-transparent">of Rewards</span>
          </h2>
          <p className="mt-2 max-w-[520px] text-[11px] leading-5 text-[#BDE7CE] sm:text-[12px]">
            Get $10 on your qualifying purchase. Earn another $10 for every friend who qualifies.
          </p>
        </div>
        <div className="season-card relative hidden shrink-0 sm:block">
          <div className="absolute -inset-3 rounded-[18px] bg-[#0E7A44]/20 blur-xl" />
          <div className="relative w-[112px] rounded-[16px] border border-[#FFE9A8]/30 bg-[linear-gradient(150deg,#0B3D27_0%,#0A2C1D_100%)] p-3 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.8)]">
            <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-[#9FDDB4]">Rewards</p>
            <p className="mt-2 bg-[linear-gradient(100deg,#FFE9A8,#E3B64A)] bg-clip-text text-[34px] font-bold leading-none text-transparent">$10</p>
            <p className="mt-1 text-[6.5px] uppercase tracking-[0.12em] text-white/40">Per qualifying purchase</p>
            <div className="mt-3 h-1.5 w-2/3 rounded-full bg-[#E3B64A]/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
