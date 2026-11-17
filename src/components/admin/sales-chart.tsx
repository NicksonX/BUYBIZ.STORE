"use client";

import { useRef, useState } from "react";
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

const WIDTH = 720;
const HEIGHT = 250;
const PAD = { top: 18, right: 16, bottom: 32, left: 48 };

export function AdminSalesChart({ data }: { data: Point[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const values = data.map((point) => point.totalMinor / 100);
  const total = data.reduce((sum, point) => sum + point.totalMinor, 0);
  const max = Math.max(...values, 1);
  const hasData = values.some((value) => value > 0);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (index / Math.max(1, values.length - 1)) * plotW;
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const line = values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(values.length - 1).toFixed(1)} ${PAD.top + plotH} L ${PAD.left} ${PAD.top + plotH} Z`;

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !values.length) return;
    const relative = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round(((relative - PAD.left) / plotW) * (values.length - 1));
    setHovered(Math.max(0, Math.min(values.length - 1, index)));
  }

  return (
    <section className="relative min-w-0 max-w-full overflow-hidden rounded-[16px] border border-[#22252a] bg-[#0A0B0D] text-white shadow-[0_30px_60px_-45px_rgba(0,0,0,0.8)]">
      <div className="relative flex flex-col justify-between gap-3 px-5 pt-5 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Sales over the last six months</h2>
          <p className="mt-1 text-[10.5px] text-white/60">Fulfilled proxy orders. Wallet deposits are not included.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.12em] text-white/55">Total completed</p>
            <p className="tabular mt-1 text-[15px] font-semibold tracking-[-0.03em]">{formatNaira(total, { exact: true })}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[9px] font-medium text-white/65">6 months</span>
        </div>
      </div>

      <div className="relative h-[236px] w-full px-2 pb-2">
        {hasData ? (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-full w-full touch-none"
              role="img"
              aria-label="Monthly fulfilled proxy sales"
              onPointerMove={onMove}
              onPointerLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="buybiz-admin-sales-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((step) => {
                const value = (max / 3) * step;
                const lineY = y(value);
                return (
                  <g key={step}>
                    <line x1={PAD.left} x2={WIDTH - PAD.right} y1={lineY} y2={lineY} stroke="rgba(255,255,255,0.07)" />
                    <text x={PAD.left - 8} y={lineY + 3} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="9">{compactNaira(value)}</text>
                  </g>
                );
              })}
              <path d={area} fill="url(#buybiz-admin-sales-fill)" />
              <path d={line} fill="none" stroke="#ffffff" strokeWidth="1.8" />
              {data.map((point, index) => (
                <text key={point.month} x={x(index)} y={HEIGHT - 8} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9">{monthLabel(point.month)}</text>
              ))}
              {hovered !== null ? (
                <g>
                  <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.22)" strokeDasharray="3 3" />
                  <circle cx={x(hovered)} cy={y(values[hovered])} r="4" fill="#fff" stroke="#0A0B0D" strokeWidth="2" />
                </g>
              ) : null}
            </svg>
            {hovered !== null ? (
              <div className="pointer-events-none absolute top-3 z-10 min-w-[120px] rounded-[8px] border border-white/15 bg-[#17191d] px-3 py-2 shadow-xl" style={{ left: `${Math.min(82, Math.max(2, (x(hovered) / WIDTH) * 100))}%` }}>
                <p className="text-[8.5px] uppercase tracking-[0.1em] text-white/55">{monthLabel(data[hovered].month)}</p>
                <p className="tabular mt-1 text-[12px] font-medium text-white">{formatNaira(values[hovered] * 100, { exact: true })}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-[12px] font-medium text-white/75">No completed sales yet.</p>
            <p className="max-w-[300px] text-[10px] leading-4 text-white/55">Fulfilled proxy orders will appear here. Deposits are not counted as sales.</p>
          </div>
        )}
      </div>
    </section>
  );
}
