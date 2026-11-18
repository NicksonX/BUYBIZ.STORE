/**
 * Original BUYBIZ hero illustration: a dark globe, live network arcs and
 * relay infrastructure. Resolution-independent SVG, no external assets.
 */
const heroNodes = [
  ["NYC", 245, 236, "United States", "end"],
  ["LON", 398, 190, "United Kingdom", "middle"],
  ["LAG", 407, 356, "Nigeria", "middle"],
  ["FRA", 566, 286, "Germany", "start"],
  ["SGP", 508, 409, "Singapore", "middle"],
] as const;

export function HeroNetworkVisual({ compact = false, id = "hero-network" }: { compact?: boolean; id?: string }) {
  const prefix = `${id}-${compact ? "compact" : "desktop"}`;
  return (
    <svg viewBox="0 0 760 620" role="img" aria-label="Global proxy network connecting BUYBIZ relay nodes across regions" className="h-full w-full">
      <defs>
        <radialGradient id={`${prefix}-glow`} cx="50%" cy="48%" r="52%">
          <stop offset="0%" stopColor="#24312A" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#0B0F0D" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#08090B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${prefix}-sphere`} cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#38493F" />
          <stop offset="42%" stopColor="#151C18" />
          <stop offset="100%" stopColor="#07090A" />
        </radialGradient>
        <linearGradient id={`${prefix}-arc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B9FF66" stopOpacity="0" />
          <stop offset="35%" stopColor="#B9FF66" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={`${prefix}-arc2`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8BE9C0" stopOpacity="0" />
          <stop offset="48%" stopColor="#8BE9C0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#B9FF66" stopOpacity="0.12" />
        </linearGradient>
        <pattern id={`${prefix}-dots`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1" fill="#FFFFFF" fillOpacity="0.16" />
        </pattern>
        <pattern id={`${prefix}-grid`} width="42" height="42" patternUnits="userSpaceOnUse">
          <path d="M42 0H0V42" fill="none" stroke="#FFFFFF" strokeOpacity="0.035" strokeWidth="1" />
        </pattern>
        <filter id={`${prefix}-glow-filter`} x="-200%" y="-200%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`${prefix}-clip`}><circle cx="395" cy="302" r="214" /></clipPath>
      </defs>

      <rect width="760" height="620" fill="#08090B" />
      <rect width="760" height="620" fill={`url(#${prefix}-grid)`} />
      <circle cx="430" cy="285" r="288" fill={`url(#${prefix}-glow)`} />
      <circle cx="395" cy="302" r="214" fill={`url(#${prefix}-sphere)`} stroke="#B9FF66" strokeOpacity="0.18" />

      <g clipPath={`url(#${prefix}-clip)`} fill="none">
        <g stroke="#B9FF66" strokeOpacity="0.16" strokeWidth="1">
          <ellipse cx="395" cy="302" rx="214" ry="214" />
          <ellipse cx="395" cy="302" rx="168" ry="214" />
          <ellipse cx="395" cy="302" rx="112" ry="214" />
          <ellipse cx="395" cy="302" rx="52" ry="214" />
          <path d="M181 302h428M195 244h400M195 360h400M223 188h344M223 416h344M275 128h240M275 476h240" />
          <path d="M395 88c-76 48-120 122-120 214s44 166 120 214M395 88c76 48 120 122 120 214s-44 166-120 214" />
        </g>
        <g fill="#B9FF66" fillOpacity="0.22">
          <path d="M225 260l25-12 19 8 8 20-18 16-27-4-10-16zM354 192l27-18 29 9 7 18-19 17-27-5-12-12z" />
          <path d="M301 339l28-15 31 9 12 25-22 27-30-7-16-20zM467 226l21-12 26 7 10 19-19 19-27-5-12-16z" />
          <path d="M512 344l30-16 34 11 13 28-25 29-33-8-18-22zM571 291l19-10 23 8 7 17-16 17-24-5-9-13z" />
        </g>
        <g fill="#FFFFFF" fillOpacity="0.09">
          <path d="M186 213l16-13 17 3 8 13-14 15-20-4zM246 173l12-10 15 4 4 11-12 12-15-5zM337 279l14-9 13 5 5 12-12 12-14-5zM409 403l17-8 18 6 5 15-16 14-19-6zM479 167l13-8 16 5 5 12-14 13-16-5zM536 246l12-7 14 4 4 11-12 12-14-4z" />
        </g>
        <circle cx="395" cy="302" r="214" fill={`url(#${prefix}-dots)`} opacity="0.16" />
      </g>

      <g fill="none" strokeLinecap="round">
        <path d="M245 236Q320 126 398 190" stroke={`url(#${prefix}-arc)`} strokeWidth="2.2" strokeDasharray="5 9" className="hero-network-flow" />
        <path d="M398 190Q500 206 566 286" stroke={`url(#${prefix}-arc2)`} strokeWidth="1.6" strokeDasharray="3 8" className="hero-network-flow hero-network-flow-slow" />
        <path d="M566 286Q582 388 508 409" stroke={`url(#${prefix}-arc)`} strokeWidth="1.5" strokeDasharray="4 9" className="hero-network-flow" />
        <path d="M508 409Q444 402 407 356" stroke={`url(#${prefix}-arc2)`} strokeWidth="1.4" strokeDasharray="3 8" className="hero-network-flow hero-network-flow-slow" />
        <path d="M407 356Q334 354 245 236" stroke={`url(#${prefix}-arc)`} strokeWidth="1.3" strokeDasharray="4 10" opacity="0.6" />
        <path d="M398 190Q458 126 566 286" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1" />
      </g>

      <g fontFamily="Arial, Helvetica, sans-serif" fontSize="8" letterSpacing="1.4" fill="#FFFFFF">
        {heroNodes.map(([label, x, y, region, anchor]) => (
          <g key={String(label)}>
            <circle cx={Number(x)} cy={Number(y)} r="4.5" fill="#B9FF66" fillOpacity="0.2" filter={`url(#${prefix}-glow-filter)`} />
            <circle cx={Number(x)} cy={Number(y)} r="2.2" fill="#B9FF66" />
            <text x={Number(x) + (anchor === "end" ? -12 : 12)} y={Number(y) - 9} textAnchor={anchor} fill="#FFFFFF" fillOpacity="0.9" fontWeight="700">{String(label)}</text>
            <text x={Number(x) + (anchor === "end" ? -12 : 12)} y={Number(y) + 13} textAnchor={anchor} fill="#FFFFFF" fillOpacity="0.34" fontSize="6.5">{String(region)}</text>
          </g>
        ))}
      </g>

      <g transform="translate(44 452)">
        <rect width="190" height="112" rx="12" fill="#0B0F0D" stroke="#FFFFFF" strokeOpacity="0.12" />
        <text x="16" y="22" fontFamily="Arial, Helvetica, sans-serif" fontSize="7" letterSpacing="1.8" fill="#FFFFFF" fillOpacity="0.4">BUYBIZ RELAY</text>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(16 ${34 + i * 21})`}>
            <rect width="158" height="15" rx="4" fill="#111814" stroke="#FFFFFF" strokeOpacity="0.07" />
            <circle cx="9" cy="7.5" r="2" fill={i === 0 ? "#B9FF66" : "#6EE7B7"} fillOpacity={i === 0 ? "1" : "0.5"} />
            <rect x="18" y="6" width={i === 0 ? "55" : "38"} height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.24" />
            <rect x="128" y="6" width="18" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.13" />
          </g>
        ))}
        <text x="16" y="104" fontFamily="Arial, Helvetica, sans-serif" fontSize="6.5" letterSpacing="1.2" fill="#FFFFFF" fillOpacity="0.28">ENCRYPTED ROUTING · NO AUTO-RENEWAL</text>
      </g>

      <g transform="translate(566 42)" fontFamily="Arial, Helvetica, sans-serif">
        <rect width="150" height="62" rx="10" fill="#0B0F0D" stroke="#FFFFFF" strokeOpacity="0.1" />
        <text x="14" y="20" fontSize="7" letterSpacing="1.4" fill="#FFFFFF" fillOpacity="0.38">GLOBAL PROXY MESH</text>
        <circle cx="16" cy="38" r="3" fill="#B9FF66" />
        <text x="26" y="41" fontSize="10" fontWeight="700" fill="#FFFFFF">Live regions</text>
        <text x="126" y="41" fontSize="9" fill="#B9FF66">6</text>
        <text x="14" y="54" fontSize="6.5" letterSpacing="1.1" fill="#FFFFFF" fillOpacity="0.28">LATENCY-AWARE ROUTES</text>
      </g>

      <text x="44" y="54" fontFamily="Arial, Helvetica, sans-serif" fontSize="8" letterSpacing="2.2" fill="#FFFFFF" fillOpacity="0.35">BUYBIZ / NETWORK</text>
      <line x1="44" y1="68" x2="150" y2="68" stroke="#B9FF66" strokeOpacity="0.45" strokeWidth="1" />
      <text x="44" y="84" fontFamily="Arial, Helvetica, sans-serif" fontSize="7" letterSpacing="1.1" fill="#FFFFFF" fillOpacity="0.25">ONE WALLET · GLOBAL ACCESS</text>
    </svg>
  );
}
