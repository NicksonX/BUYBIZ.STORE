import { cn } from "@/lib/utils";

/**
 * Original BUYBIZ monogram: an angular "B" cut from a high-contrast tile.
 * The same path is used for the favicon, app icon and exported SVG assets.
 */
export function LogoMark({
  tone = "auto",
  className,
}: {
  tone?: "auto" | "onDark" | "onLight";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[26%]",
        tone === "onDark" && "bg-white text-[#0A0B0D]",
        tone === "onLight" && "bg-[#0A0B0D] text-white",
        tone === "auto" && "bg-foreground text-background",
        className,
      )}
    >
      <svg
        viewBox="0 0 40 40"
        className="h-[62%] w-[62%]"
        fill="currentColor"
        fillRule="evenodd"
        focusable="false"
      >
        <path d="M12 7h12.6L34 16l-6.2 4 6.2 4-9.4 9H12V7Zm5 5v5h8l4-3.6L25 12h-8Zm0 12v6h9l4-3.6L25 24h-8Z" />
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-[26%] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]" />
    </span>
  );
}

export function Logo({
  tone = "auto",
  size = "md",
  wordmark = true,
  className,
  markClassName,
  wordmarkClassName,
}: {
  tone?: "auto" | "onDark" | "onLight";
  size?: "xs" | "sm" | "md" | "lg";
  wordmark?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  const markSize = {
    xs: "h-6 w-6 rounded-[7px]",
    sm: "h-8 w-8 rounded-[9px]",
    md: "h-9 w-9 rounded-[10px]",
    lg: "h-11 w-11 rounded-[12px]",
  }[size];

  const wordSize = {
    xs: "text-[13px]",
    sm: "text-[17px]",
    md: "text-[20px]",
    lg: "text-[24px]",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className={cn(markSize, markClassName)} />
      {wordmark ? (
        <span
          className={cn(
            "select-none font-bold uppercase leading-none tracking-[-0.055em]",
            wordSize,
            tone === "onDark" && "text-white",
            tone === "onLight" && "text-[#0A0B0D]",
            wordmarkClassName,
          )}
        >
          BUYBIZ
        </span>
      ) : null}
    </span>
  );
}
