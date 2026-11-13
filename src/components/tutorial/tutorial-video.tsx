"use client";

import { useState } from "react";
import { Clock3, Play, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TutorialVideoProps = {
  variant?: "card" | "compact";
  className?: string;
  title?: string;
};

export function TutorialVideo({
  variant = "card",
  className,
  title = "How to use BUYBIZ",
}: TutorialVideoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {variant === "compact" ? (
            <button
              type="button"
              className={cn(
                "tap-target inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-[11px] font-medium transition-colors hover:bg-accent",
                className,
              )}
            >
              <Play className="h-3.5 w-3.5" /> Watch tutorial
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "group relative w-full overflow-hidden rounded-[15px] border border-[#22252a] bg-[#0A0B0D] p-4 text-left text-white transition-transform hover:-translate-y-0.5",
                className,
              )}
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/[0.08]" />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10">
                  <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
                    Getting started
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold">
                    {title}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[9px] text-white/35">
                  <Clock3 className="h-3 w-3" /> 2 min
                </span>
              </div>
              <p className="relative mt-3 text-[10px] leading-4 text-white/40">
                A short walkthrough of accounts, wallet funding and buying your
                first proxy.
              </p>
            </button>
          )}
        </DialogTrigger>

        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[900px] overflow-hidden rounded-[16px] border-black/10 bg-black p-0 text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              A short voiceover tutorial for new BUYBIZ customers.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <video
              className="aspect-video w-full bg-black"
              controls
              autoPlay
              playsInline
              preload="metadata"
              poster="/tutorial/poster.jpg"
            >
              <source src="/tutorial/buybiz-getting-started.mp4" type="video/mp4" />
              Your browser does not support the tutorial video.
            </video>
          ) : null}
          <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 text-[9px] text-white/40">
            <Sparkles className="h-3 w-3" /> BUYBIZ product walkthrough
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
