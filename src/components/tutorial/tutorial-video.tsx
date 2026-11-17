"use client";

import { useRef, useState } from "react";
import {
  Clock3,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
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
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function toggleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (video.requestFullscreen) {
      await video.requestFullscreen().catch(() => undefined);
      return;
    }
    (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
  }

  function timeLabel(value: number) {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

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
                  <Clock3 className="h-3 w-3" /> 1.5 min
                </span>
              </div>
              <p className="relative mt-3 text-[10px] leading-4 text-white/55">
                Account setup, wallet funding, proxy purchases, Referral, Campaigns, Rewards and AI support.
              </p>
            </button>
          )}
        </DialogTrigger>

        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[900px] overflow-hidden rounded-[16px] border-black/10 bg-black p-0 text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              A short walkthrough of registration, wallet funding, proxy purchases, the separate Referral, Campaigns and Rewards sections, USDT payouts and AI support.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <div className="bg-black">
              <video
                ref={videoRef}
                className="aspect-video w-full cursor-pointer bg-black"
                autoPlay
                playsInline
                preload="metadata"
                poster="/tutorial/poster.jpg?v=5"
                onClick={togglePlay}
                onLoadedMetadata={(event) => {
                  setDuration(event.currentTarget.duration);
                  setCurrentTime(event.currentTarget.currentTime);
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              >
                <source src="/tutorial/buybiz-getting-started.mp4?v=5" type="video/mp4" />
                Your browser does not support the tutorial video.
              </video>
              <div className="flex items-center gap-3 border-t border-white/10 bg-[#0A0B0D] px-3 py-2.5 sm:px-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? "Pause tutorial" : "Play tutorial"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0A0B0D] transition-transform hover:scale-105"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
                </button>
                <span className="tabular shrink-0 text-[10px] text-white/70">
                  {timeLabel(currentTime)} / {timeLabel(duration)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => seek(Number(event.target.value))}
                  aria-label="Seek tutorial video"
                  className="h-1.5 min-w-0 flex-1 cursor-pointer accent-white"
                />
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute tutorial" : "Mute tutorial"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/65 hover:bg-white/10 hover:text-white"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label="Toggle fullscreen"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/65 hover:bg-white/10 hover:text-white"
                >
                  {typeof document !== "undefined" && document.fullscreenElement ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 text-[9px] text-white/40">
            <Sparkles className="h-3 w-3" /> BUYBIZ product walkthrough · captions on
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
