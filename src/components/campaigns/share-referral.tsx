"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function ShareReferral({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy your campaign link", value);
    }
  }
  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "BUYBIZ campaign", text: "Join me on BUYBIZ", url: value }).catch(() => {});
    } else {
      await copy();
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void copy()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[9.5px] font-medium hover:bg-accent">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
      </button>
      <button type="button" onClick={() => void share()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-[9.5px] font-semibold text-background">
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
    </div>
  );
}
