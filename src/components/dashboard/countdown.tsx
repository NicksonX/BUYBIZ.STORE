"use client";

import { useEffect, useState } from "react";
import { formatRemaining } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Countdown({
  expiresAt,
  className,
}: {
  expiresAt: string | Date;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatRemaining(expiresAt));

  useEffect(() => {
    const update = () => setLabel(formatRemaining(expiresAt));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const expired = label === "Expired";
  return (
    <span
      suppressHydrationWarning
      className={cn(expired ? "text-muted-foreground" : "", className)}
    >
      {label}
    </span>
  );
}
