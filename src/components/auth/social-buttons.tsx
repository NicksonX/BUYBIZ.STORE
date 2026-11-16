"use client";

import { useActionState } from "react";
import { oauthAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";
import { LoadingDots } from "@/components/ui/loading-dots";

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

export function SocialButtons({
  next,
  googleEnabled,
  className,
}: {
  next?: string;
  googleEnabled: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(
    oauthAction,
    initialActionState,
  );

  const anyEnabled = googleEnabled;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative flex items-center gap-3">
        <span className="h-px flex-1 bg-black/[0.08]" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#0A0B0D]/35">
          or continue with
        </span>
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <form action={formAction}>
        <input type="hidden" name="provider" value="google" />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <button
          type="submit"
          disabled={!googleEnabled || pending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-black/[0.09] bg-white text-[12px] font-medium text-[#0A0B0D] shadow-xs transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? <LoadingDots /> : <GoogleIcon />}
          Continue with Google
        </button>
      </form>

      {!anyEnabled ? (
        <p className="text-center text-[9.5px] leading-4 text-[#0A0B0D]/35">
          Google sign-in becomes available once the provider is configured in
          Supabase. Email and password work today.
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
