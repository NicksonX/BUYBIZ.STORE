"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-[9px] text-muted-foreground">
        {label ? monthLabel(label) : ""}
      </p>
      <p className="tabular mt-1 text-[12px] font-semibold text-foreground">
        {formatNaira(Number(payload[0]?.value ?? 0) * 100, { exact: true })}
      </p>
    </div>
  );
}

export function AdminSalesChart({ data }: { data: Point[] }) {
  const chartData = data.map((point) => ({
    month: point.month,
    value: point.totalMinor / 100,
  }));
  const total = data.reduce((sum, point) => sum + point.totalMinor, 0);

  return (
    <div className="surface-card relative overflow-hidden rounded-[15px] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[-0.02em]">
            Sales over the last six months
          </h2>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Completed proxy orders. Wallet deposits are not included.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[9px] text-muted-foreground">Total completed</p>
          <p className="tabular mt-1 text-[16px] font-semibold tracking-[-0.03em]">
            {formatNaira(total, { exact: true })}
          </p>
        </div>
      </div>
      <div className="mt-5 h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
              dy={6}
            />
            <YAxis
              tickFormatter={(value) => compactNaira(Number(value))}
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "var(--accent)", opacity: 0.55 }}
            />
            <Bar
              dataKey="value"
              fill="var(--foreground)"
              radius={[4, 4, 1, 1]}
              maxBarSize={42}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
