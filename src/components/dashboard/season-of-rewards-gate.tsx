"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SeasonOfRewardsPopup } from "@/components/dashboard/season-of-rewards-popup";

type Data = Parameters<typeof SeasonOfRewardsPopup>[0]["data"];

export function SeasonOfRewardsGate({ data }: { data: Data }) {
  const pathname = usePathname();
  const [entry, setEntry] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setVisible(false);
      return;
    }
    setVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setEntry((value) => value + 1);
      setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const onPageShow = () => {
      if (window.location.pathname === "/dashboard") {
        setEntry((value) => value + 1);
        setVisible(true);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (!data || !visible) return null;
  return <SeasonOfRewardsPopup key={entry} data={data} />;
}
