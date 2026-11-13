"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/utils";

type Point = { month: string; totalMinor: number };

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

function compactNaira(naira: number) {
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}m`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}k`;
  return `₦${Math.round(naira)}`;
}

export function AdminSalesChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((sum, point) => sum + point.totalMinor, 0);
  const max = Math.max(...data.map((point) => point.totalMinor / 100), 1);
  const width = 720;
  const height = 230;
  const pad = { top: 14, right: 8, bottom: 28, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(42, slot * 0.48);

  return (
    <div className="surface-card relative overflow-hidden rounded-[15px] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[-0.02em]">Sales over the last six months</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">Completed proxy orders. Wallet deposits are not included.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[9px] text-muted-foreground">Total completed</p>
          <p className="tabular mt-1 text-[16px] font-semibold tracking-[-0.03em]">{formatNaira(total, { exact: true })}</p>
        </div>
      </div>
      {total === 0 ? (
        <p className="py-14 text-center text-[10px] text-muted-foreground">No completed sales in this period.</p>
      ) : (
        <div className="relative mt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full" role="img" aria-label="Sales over the last six months">
            {[0, 1, 2, 3].map((step) => {
              const value = (max / 3) * step;
              const y = pad.top + plotH - (value / max) * plotH;
              return (
                <g key={step}>
                  <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--border)" />
                  <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="var(--muted-foreground)" fontSize="9">{compactNaira(value)}</text>
                </g>
              );
            })}
            {data.map((point, index) => {
              const value = point.totalMinor / 100;
              const barH = (value / max) * plotH;
              const x = pad.left + index * slot + (slot - barW) / 2;
              return (
                <g key={point.month} onPointerEnter={() => setActive(index)} onPointerLeave={() => setActive(null)}>
                  <rect x={x} y={pad.top + plotH - barH} width={barW} height={barH} rx="4" fill="var(--foreground)" opacity={active === index ? 1 : 0.88} />
                  <text x={x + barW / 2} y={height - 8} textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">{monthLabel(point.month)}</text>
                </g>
              );
            })}
          </svg>
          {active !== null ? (
            <div className="pointer-events-none absolute right-3 top-2 rounded-[8px] border border-border bg-surface px-3 py-2 shadow-lg">
              <p className="text-[9px] text-muted-foreground">{monthLabel(data[active].month)}</p>
              <p className="tabular mt-1 text-[12px] font-semibold">{formatNaira(data[active].totalMinor, { exact: true })}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
