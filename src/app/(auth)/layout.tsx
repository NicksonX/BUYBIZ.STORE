import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthVisual } from "@/components/auth/auth-visual";

function BrandHeader({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link href="/" aria-label="BUYBIZ home">
        <Logo tone={light ? "onDark" : "onLight"} size="md" />
      </Link>
      <Link
        href="/"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-colors ${
          light
            ? "border-white/15 bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white"
            : "border-black/[0.08] bg-white/70 text-[#0A0B0D]/60 hover:bg-white hover:text-[#0A0B0D]"
        }`}
      >
        <ArrowLeft className="h-3 w-3" /> Back to site
      </Link>
    </div>
  );
}

function LegalFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#0A0B0D]/45">
      <span>© {new Date().getFullYear()} BUYBIZ</span>
      <div className="flex items-center gap-3">
        <Link href="/terms" className="hover:text-[#0A0B0D]/75">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-[#0A0B0D]/75">
          Privacy
        </Link>
        <span>NGN · Nigeria</span>
      </div>
    </div>
  );
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-buybiz-pathname") || "";

  if (pathname === "/login") {
    return (
      <div className="safe-page-y flex min-h-dvh flex-col bg-[#F4F4F5] text-[#0A0B0D]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 sm:px-8">
          <BrandHeader />
          <main className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <div className="w-full max-w-[420px] rounded-[18px] border border-black/[0.07] bg-white p-6 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.45)] sm:p-8">
              {children}
            </div>
          </main>
          <div className="pb-2">
            <LegalFooter />
          </div>
        </div>
      </div>
    );
  }

  if (pathname === "/register" || pathname.startsWith("/register/")) {
    return (
      <div className="min-h-dvh bg-[#F4F4F5] text-[#0A0B0D]">
        <div className="grid min-h-dvh lg:grid-cols-2">
          <aside className="relative hidden overflow-hidden bg-black lg:block">
            <Image
              src="/auth/signup-reference.png"
              alt="Secure BUYBIZ account sign-up illustration"
              fill
              priority
              sizes="50vw"
              className="object-cover object-center"
            />
          </aside>
          <div className="flex min-h-dvh flex-col bg-white">
            <div className="px-5 pt-6 sm:px-10">
              <BrandHeader />
            </div>
            <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
              <div className="w-full max-w-[430px]">{children}</div>
            </main>
            <div className="px-5 pb-6 sm:px-10">
              <LegalFooter />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F4F4F5] text-[#0A0B0D]">
      <div className="grid min-h-dvh lg:grid-cols-[1.02fr_0.98fr]">
        <div className="safe-page-y flex min-h-dvh flex-col px-5 sm:px-10 lg:px-16">
          <BrandHeader />
          <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <div className="w-full max-w-[390px]">{children}</div>
          </div>
          <LegalFooter />
        </div>
        <AuthVisual />
      </div>
    </div>
  );
}
