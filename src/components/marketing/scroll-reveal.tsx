"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight, shared entrance motion for marketing pages. The first section
 * (hero) is left untouched; later sections reveal once as they enter view.
 */
export function MarketingReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector("main");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("section"));
    sections.forEach((section, index) => {
      if (index === 0) return;
      section.dataset.reveal = "";
    });
    document.documentElement.classList.add("reveal-ready");
    if (reduce) {
      sections.forEach((section) => section.classList.add("is-revealed"));
      return () => document.documentElement.classList.remove("reveal-ready");
    }
    if (!("IntersectionObserver" in window)) {
      sections.slice(1).forEach((section) => section.classList.add("is-revealed"));
      return () => document.documentElement.classList.remove("reveal-ready");
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    sections.slice(1).forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, [pathname]);

  return null;
}
