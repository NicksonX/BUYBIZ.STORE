"use client";

import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";
import { verifyOtpAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";

export function OtpForm({ email, next }: { email?: string; next: string }) {
  const [otpEmail, setOtpEmail] = useState(email ?? "");
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(
    verifyOtpAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>
          {state.message}
        </Alert>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <label className="block text-[10px] font-medium text-[#0A0B0D]/65" htmlFor="otp-email">
        Email address
      </label>
      <Input id="otp-email" name="email" type="email" required value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} placeholder="you@example.com" className="h-10" />
      <label className="block text-[10px] font-medium text-[#0A0B0D]/65" htmlFor="otp-code">
        6-digit code
      </label>
      <Input
        id="otp-code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        required
        placeholder="000000"
        className="h-12 text-center font-mono text-[22px] tracking-[0.35em]"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-[#0A0B0D] text-[11.5px] font-semibold text-white hover:bg-[#1A1C1F] disabled:opacity-50"
      >
        {pending ? <LoadingDots /> : <MailCheck className="h-4 w-4" />}
        Verify email
      </button>
      <p className="text-center text-[8.5px] leading-4 text-[#0A0B0D]/35">
        Codes expire after 10 minutes and can only be used once. Never share a code with anyone.
      </p>
    </form>
  );
}
