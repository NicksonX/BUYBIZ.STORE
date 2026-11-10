import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "BUYBIZ: Your one-stop digital marketplace",
    template: "%s · BUYBIZ",
  },
  description:
    "BUYBIZ is a Nigeria-focused digital marketplace. Fund your wallet and buy shared proxy access for 24 hours, 7 days or 30 days. Virtual numbers and PayPal services are coming soon.",
  applicationName: "BUYBIZ",
  authors: [{ name: "BUYBIZ" }],
  keywords: [
    "BUYBIZ",
    "proxy marketplace Nigeria",
    "buy proxy with naira",
    "digital marketplace",
    "NGN wallet",
  ],
  openGraph: {
    type: "website",
    siteName: "BUYBIZ",
    title: "BUYBIZ: Your one-stop digital marketplace",
    description:
      "Wallet-first proxy access with clear pricing and honest terms. Virtual numbers and PayPal services are coming soon.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "BUYBIZ: Your one-stop digital marketplace",
    description:
      "Wallet-first proxy access with clear pricing and honest terms.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F4F5" },
    { media: "(prefers-color-scheme: dark)", color: "#08090B" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
