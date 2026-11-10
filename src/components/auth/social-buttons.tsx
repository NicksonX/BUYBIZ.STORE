"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { oauthAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12s3.36-7.27 7.19-7.27c3.08 0 4.82 1.97 4.82 1.97l1.93-1.93S16.74 2 12.19 2C6.5 2 2 6.5 2 12s4.5 10 10.19 10c5.31 0 9.26-3.73 9.26-8.98 0-.66-.1-1.92-.1-1.92Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M16.36 12.66c.02-2.16 1.76-3.2 1.84-3.25-1-1.47-2.57-1.67-3.12-1.7-1.33-.13-2.6.78-3.28.78-.67 0-1.72-.76-2.83-.74-1.45.02-2.8.85-3.55 2.15-1.52 2.63-.39 6.53 1.1 8.67.73 1.04 1.59 2.21 2.73 2.17 1.1-.04 1.51-.7 2.84-.7 1.33 0 1.7.7 2.86.68 1.18-.02 1.94-1.06 2.66-2.11.84-1.21 1.18-2.38 1.2-2.44-.03-.01-2.3-.88-2.45-3.51ZM14.2 6.03c.6-.72 1-1.73.89-2.73-.86.04-1.9.57-2.52 1.29-.55.64-1.03 1.65-.9 2.63.97.08 1.94-.49 2.53-1.19Z" />
    </svg>
  );
}

export function SocialButtons({
  next,
  googleEnabled,
  appleEnabled,
  className,
}: {
  next?: string;
  googleEnabled: boolean;
  appleEnabled: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(
    oauthAction,
    initialActionState,
  );

  const anyEnabled = googleEnabled || appleEnabled;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative flex items-center gap-3">
        <span className="h-px flex-1 bg-black/[0.08]" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#0A0B0D]/35">
          or continue with
        </span>
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <form action={formAction}>
          <input type="hidden" name="provider" value="google" />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <button
            type="submit"
            disabled={!googleEnabled || pending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-black/[0.09] bg-white text-[12px] font-medium text-[#0A0B0D] shadow-xs transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GoogleIcon />}
            Google
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="provider" value="apple" />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <button
            type="submit"
            disabled={!appleEnabled || pending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-black/[0.09] bg-white text-[12px] font-medium text-[#0A0B0D] shadow-xs transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AppleIcon />}
            Apple
          </button>
        </form>
      </div>

      {!anyEnabled ? (
        <p className="text-center text-[9.5px] leading-4 text-[#0A0B0D]/35">
          Social sign-in becomes available once Google and Apple providers are
          configured in Supabase. Email and password work today.
        </p>
      ) : null}

      {state.message ? (
        <p className="rounded-[8px] border border-[#B3261E]/15 bg-[#FDECEB] px-3 py-2 text-[10.5px] leading-4 text-[#B3261E]">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
