import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params = {},
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (nextPage: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <p className="text-[11.5px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from} to {to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={href(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-[8px] border border-border px-2.5 text-[11.5px] font-medium transition-colors hover:bg-accent",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Link>
        <span className="px-1 text-[11.5px] text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Link
          href={href(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-[8px] border border-border px-2.5 text-[11.5px] font-medium transition-colors hover:bg-accent",
            page >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
