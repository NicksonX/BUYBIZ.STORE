import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthVisual } from "@/components/auth/auth-visual";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F4F4F5] text-[#0A0B0D]">
      <div className="grid min-h-dvh lg:grid-cols-[1.02fr_0.98fr]">
        <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="BUYBIZ home">
              <Logo tone="onLight" size="md" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/70 px-3 py-1.5 text-[10.5px] font-medium text-[#0A0B0D]/60 transition-colors hover:bg-white hover:text-[#0A0B0D]"
            >
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <div className="w-full max-w-[390px]">{children}</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#0A0B0D]/35">
            <span>© {new Date().getFullYear()} BUYBIZ</span>
            <div className="flex items-center gap-3">
              <Link href="/terms" className="hover:text-[#0A0B0D]/70">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-[#0A0B0D]/70">
                Privacy
              </Link>
              <span>NGN · Nigeria</span>
            </div>
          </div>
        </div>

        <AuthVisual />
      </div>
    </div>
  );
}
