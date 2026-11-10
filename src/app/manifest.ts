import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BUYBIZ Digital Marketplace",
    short_name: "BUYBIZ",
    description:
      "Wallet-first proxy access for Nigeria. Virtual numbers and PayPal services are coming soon.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090B",
    theme_color: "#08090B",
    icons: [
      {
        src: "/brand/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
