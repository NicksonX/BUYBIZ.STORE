"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Flame, X } from "lucide-react";

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

const STORAGE_KEY = "buybiz_ambassador_float_y";

export function AmbassadorFloat({
  isAmbassador,
  qualified,
  required,
  commissionCents,
  availableCents,
}: {
  isAmbassador: boolean;
  qualified: number;
  required: number;
  commissionCents: number;
  availableCents: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [y, setY] = useState<number | null>(null);
  const drag = useRef({
    active: false,
    moved: false,
    startY: 0,
    offsetY: 0,
  });

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    const initial =
      Number.isFinite(stored) && stored > 0
        ? stored
        : Math.round(window.innerHeight - 170);
    // Restoring a device-local drag position is external-store synchronization,
    // not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setY(clampY(initial));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    function onResize() {
      setY((current) => (current === null ? null : clampY(current)));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (pathname !== "/dashboard") return null;

  const progress = Math.min(100, Math.round((qualified / Math.max(required, 1)) * 100));
  const reward = usd(commissionCents);
  const remaining = Math.max(0, required - qualified);

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      active: true,
      moved: false,
      startY: event.clientY,
      offsetY: event.clientY - (y ?? window.innerHeight - 170),
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current.active) return;
    const next = event.clientY - drag.current.offsetY;
    if (Math.abs(event.clientY - drag.current.startY) > 5) drag.current.moved = true;
    if (drag.current.moved) {
      event.preventDefault();
      const nextY = clampY(next);
      setY(nextY);
      localStorage.setItem(STORAGE_KEY, String(Math.round(nextY)));
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.current.moved) router.push("/dashboard/referrals");
  }

  return (
    <div
      className="fixed right-3 z-40 sm:right-5"
      style={{ top: y ?? "60dvh" }}
      data-ambassador-float
    >
      {open ? (
        <div
          id="ambassador-float-panel"
          className="absolute bottom-[calc(100%+10px)] right-0 w-[min(290px,calc(100vw-24px))] overflow-hidden rounded-[14px] border border-[#ff5a36]/35 bg-[#210705] p-4 text-white shadow-[0_24px_70px_-30px_rgba(0,0,0,0.85)]"
          role="region"
          aria-label="Ambassador rewards"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#ff4d22]/25 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff8b68]/30 bg-[#ff5a36]/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#ffc4b0]">
                <Flame className="h-2.5 w-2.5 fill-[#ff6b3d] text-[#ff6b3d]" /> Ambassador
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Ambassador rewards"
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2.5 text-[17px] font-semibold leading-[1.1] tracking-[-0.03em]">
              {isAmbassador ? `Earn ${reward} for every friend.` : `Invite friends. Earn ${reward} rewards.`}
            </p>
            <p className="mt-1.5 text-[9px] leading-4 text-white/70">
              {isAmbassador
                ? `No cap on qualified referrals. Every one adds ${reward} to your separate USD balance.`
                : `Free to join. Unlock Ambassador at ${required} qualified referrals, then earn ${reward} per qualified friend with no cap.`}
            </p>
            <div className="mt-3 rounded-[8px] border border-white/10 bg-black/20 px-2.5 py-2">
              <div className="flex items-center justify-between text-[8px] text-white/65">
                <span>{isAmbassador ? "USD available" : "Progress"}</span>
                <span className="tabular font-semibold text-white">
                  {isAmbassador ? usd(availableCents) : `${qualified}/${required}`}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff8a4c] to-[#ff3d1f]"
                  style={{ width: `${isAmbassador ? 100 : progress}%` }}
                />
              </div>
              {!isAmbassador ? (
                <p className="mt-1.5 text-[8px] text-white/60">
                  {remaining} more to unlock Ambassador.
                </p>
              ) : null}
            </div>
            <Link
              href="/dashboard/referrals"
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#ff5a36] text-[10px] font-bold text-[#210705]"
            >
              {isAmbassador ? "Open Ambassador dashboard" : "Start inviting"} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="ambassador-float-panel"
        aria-label={open ? "Close Ambassador rewards" : "Open Ambassador rewards"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        title="Drag to move · Ambassador rewards"
        className="group relative flex h-[46px] w-[46px] cursor-grab touch-none items-center justify-center rounded-full border border-[#ff8b68]/35 bg-gradient-to-br from-[#ff6a3d] to-[#e53416] text-[#210705] shadow-[0_12px_36px_-12px_rgba(229,52,22,0.8)] active:cursor-grabbing"
      >
        <Flame className="h-5 w-5 fill-[#210705]/20" strokeWidth={1.8} />
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#210705] bg-[#ffd166] px-1 text-[8px] font-black text-[#210705]">
          ${(commissionCents / 100).toFixed(0)}
        </span>
        <span className="sr-only">Ambassador rewards</span>
      </button>
    </div>
  );
}

function clampY(value: number) {
  if (typeof window === "undefined") return value;
  const min = 330;
  const max = Math.max(min, window.innerHeight - 120);
  return Math.min(Math.max(value, min), max);
}
