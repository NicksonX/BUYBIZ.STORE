import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/marketplace",
    "/how-it-works",
    "/pricing",
    "/campaigns/customer-referrer-10",
    "/faq",
    "/contact",
    "/coming-soon",
    "/coming-soon/phone-numbers",
    "/coming-soon/paypal",
    "/terms",
    "/privacy",
    "/login",
    "/register",
  ];
  return routes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/coming-soon") ? 0.4 : 0.7,
  }));
}
