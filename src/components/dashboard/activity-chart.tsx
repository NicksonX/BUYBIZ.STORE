"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNaira } from "@/lib/utils";

type Point = { date: string; spendMinor: number; creditMinor: number };

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function compactNaira(value: number) {
  const naira = Number(value);
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}m`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}k`;
  return `₦${Math.round(naira)}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[9px] border border-white/15 bg-[#17191d] px-3 py-2 shadow-xl">
      <p className="text-[9px] uppercase tracking-[0.1em] text-white/40">
        {label ? dateLabel(label) : ""}
      </p>
      <p className="tabular mt-1 text-[12px] font-medium text-white">
        {formatNaira(Number(payload[0]?.value ?? 0) * 100, { exact: true })}
      </p>
    </div>
  );
}

export function ActivityChart({
  data,
  totalSpendMinor,
}: {
  data: Point[];
  totalSpendMinor: number;
}) {
  const totalCredits = data.reduce((sum, point) => sum + point.creditMinor, 0);
  const useCredits = totalSpendMinor === 0 && totalCredits > 0;
  const seriesKey = useCredits ? "creditMinor" : "spendMinor";
  const total = useCredits ? totalCredits : totalSpendMinor;
  const chartData = data.map((point) => ({
    ...point,
    value: Number(point[seriesKey]) / 100,
  }));
  const hasData = chartData.some((point) => point.value > 0);

  return (
    <section className="relative overflow-hidden rounded-[16px] border border-[#22252a] bg-[#0A0B0D] text-white shadow-[0_30px_60px_-45px_rgba(0,0,0,0.8)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_80%_0%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="relative flex flex-col justify-between gap-3 px-5 pt-5 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">
            Wallet activity
          </h2>
          <p className="mt-1 text-[10.5px] text-white/35">
            {useCredits ? "Money in" : "Money out"} over the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.12em] text-white/30">
              {useCredits ? "Credited" : "Spent"}
            </p>
            <p className="tabular mt-1 text-[15px] font-semibold tracking-[-0.03em]">
              {formatNaira(total, { exact: true })}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[9px] font-medium text-white/50">
            Last 30 days
          </span>
        </div>
      </div>

      <div className="relative mt-2 h-[236px] w-full px-1 pb-1">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 18, right: 18, left: 2, bottom: 4 }}>
              <defs>
                <linearGradient id="buybiz-activity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.22} />
                  <stop offset="65%" stopColor="#ffffff" stopOpacity={0.045} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.055)" />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
                dy={6}
              />
              <YAxis
                tickFormatter={compactNaira}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={44}
                dx={-4}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.18)", strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={1.8}
                fill="url(#buybiz-activity-fill)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#ffffff",
                  stroke: "#0A0B0D",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-[12px] font-medium text-white/65">
              Your activity will appear here.
            </p>
            <p className="max-w-[300px] text-[10px] leading-4 text-white/30">
              Add funds or purchase a proxy to start building a real wallet
              history. We never invent chart data.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
