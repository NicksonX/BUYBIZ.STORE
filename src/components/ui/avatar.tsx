import { cn, getInitials } from "@/lib/utils";

const tones = [
  "bg-[#0A0B0D] text-white",
  "bg-[#1F2937] text-white",
  "bg-[#3F3F46] text-white",
  "bg-[#27272A] text-white",
  "bg-[#52525B] text-white",
];

export function Avatar({
  name,
  email,
  className,
  size = "md",
}: {
  name?: string | null;
  email?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const label = name || email || "BUYBIZ";
  const tone = tones[(label.charCodeAt(0) + label.length) % tones.length];
  const sizes = {
    xs: "h-6 w-6 text-[9px]",
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-[11px]",
    lg: "h-14 w-14 text-[16px]",
  }[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 font-semibold tracking-[0.02em]",
        tone,
        sizes,
        className,
      )}
    >
      {getInitials(label, email ?? undefined)}
    </span>
  );
}
