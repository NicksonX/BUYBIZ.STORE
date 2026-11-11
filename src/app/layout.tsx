import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "BUYBIZ | Buy proxy access in naira",
    template: "%s · BUYBIZ",
  },
  description:
    "Fund your BUYBIZ wallet, pick 24-hour, 7-day or 30-day shared proxy access, and get your connection details immediately. Prices are in naira.",
  applicationName: "BUYBIZ",
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
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
    title: "BUYBIZ | Buy proxy access in naira",
    description:
      "Shared proxy access priced in naira, with fixed expiry and automatic refunds when stock is unavailable.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "BUYBIZ | Buy proxy access in naira",
    description:
      "Wallet-first proxy access with clear pricing and honest terms.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BUYBIZ",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F4F5" },
    { media: "(prefers-color-scheme: dark)", color: "#08090B" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
