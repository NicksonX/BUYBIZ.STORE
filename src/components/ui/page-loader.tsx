import { LogoMark } from "@/components/brand/logo";

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="animate-pulse">
        <LogoMark className="h-9 w-9" />
      </div>
      <p className="text-[11.5px] text-muted-foreground">{label}…</p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-16 animate-pulse rounded-[12px] bg-surface-subtle" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[112px] animate-pulse rounded-[14px] border border-border bg-surface"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="h-[300px] animate-pulse rounded-[14px] border border-border bg-surface" />
        <div className="h-[300px] animate-pulse rounded-[14px] border border-border bg-surface" />
      </div>
    </div>
  );
}


export function AdminSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-14 w-64 animate-pulse rounded-[10px] bg-surface-subtle" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[112px] animate-pulse rounded-[12px] border border-border bg-surface" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <div className="h-[320px] animate-pulse rounded-[12px] border border-border bg-surface" />
        <div className="h-[320px] animate-pulse rounded-[12px] border border-border bg-surface" />
      </div>
    </div>
  );
}
