import { Clock3, Globe2, ShieldCheck, Wallet } from "lucide-react";

/**
 * Original BUYBIZ hero artwork: a glossy access pass floating over a metallic
 * orbit, with satellite service tiles. All monochrome and built from CSS/SVG.
 */
export function HeroArt() {
  return (
    <div className="buybiz-hero-stage" aria-hidden="true">
      <div className="hero-halo" />
      <div className="hero-orbit" />

      <div className="hero-dot left-[22%] top-[26%]" />
      <div className="hero-dot right-[18%] top-[38%] !h-1 !w-1" />
      <div className="hero-dot bottom-[23%] left-[35%] !h-1 !w-1" />

      <div className="hero-card-back" />
      <div className="hero-card-float">
        <div className="hero-card">
          <div className="hero-card-edge" />
          <div className="relative z-10 flex h-full flex-col justify-between text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white text-[#0A0B0D]">
                  <svg
                    viewBox="0 0 40 40"
                    className="h-4 w-4"
                    fill="currentColor"
                    fillRule="evenodd"
                  >
                    <path d="M12 7h12.6L34 16l-6.2 4 6.2 4-9.4 9H12V7Zm5 5v5h8l4-3.6L25 12h-8Zm0 12v6h9l4-3.6L25 24h-8Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase leading-none tracking-[-0.04em]">
                    BUYBIZ
                  </p>
                  <p className="mt-1 text-[7.5px] font-medium uppercase tracking-[0.22em] text-white/55">
                    Digital marketplace
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 text-[7.5px] font-semibold uppercase tracking-[0.18em] text-white/65">
                Access pass
              </span>
            </div>

            <div className="relative">
              <div className="max-w-[62%]">
                <p className="text-[8.5px] font-medium uppercase tracking-[0.22em] text-white/55">
                  NGN wallet
                </p>
                <p className="mt-2 text-[23px] font-semibold leading-[1.02] tracking-[-0.045em] text-white">
                  Proxy
                  <br />
                  access
                </p>
                <p className="mt-2 text-[9px] font-medium tracking-[0.16em] text-white/60">
                  24H · 7D · 30D
                </p>
              </div>

              <svg
                viewBox="0 0 40 40"
                className="hero-card-glyph"
                fillRule="evenodd"
              >
                <defs>
                  <linearGradient id="buybiz-card-silver" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                    <stop offset="42%" stopColor="#d6d9dd" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#8f949b" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#f4f5f6" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#buybiz-card-silver)"
                  d="M12 7h12.6L34 16l-6.2 4 6.2 4-9.4 9H12V7Zm5 5v5h8l4-3.6L25 12h-8Zm0 12v6h9l4-3.6L25 24h-8Z"
                />
              </svg>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-center gap-3">
                <div className="hero-card-chip" />
                <div>
                  <p className="text-[7.5px] font-medium uppercase tracking-[0.2em] text-white/55">
                    Shared upstream
                  </p>
                  <p className="mt-1 text-[8.5px] font-medium text-white/70">
                    Shared access
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[7.5px] font-medium uppercase tracking-[0.2em] text-white/55">
                  Built for
                </p>
                <p className="mt-1 text-[8.5px] font-medium text-white/70">
                  Nigeria · NGN
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-10 left-1/2 h-16 w-[78%] -translate-x-1/2 rounded-[50%] bg-white/10 blur-2xl" />
      </div>

      <div className="hero-tile" data-float="a">
        <Globe2 className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <div className="hero-tile" data-float="b">
        <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="hero-tile" data-float="c">
        <Wallet className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="hero-tile" data-float="d">
        <Clock3 className="h-6 w-6" strokeWidth={1.5} />
      </div>
    </div>
  );
}
