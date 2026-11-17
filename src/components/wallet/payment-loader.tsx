import { Check, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

export type PaymentVisualState = "processing" | "success" | "failed";

const labels: Record<PaymentVisualState, { title: string; detail: string }> = {
  processing: { title: "Processing your payment", detail: "Please wait. Do not close this page." },
  success: { title: "Payment successful", detail: "Your payment was verified and your wallet has been credited." },
  failed: { title: "Payment not completed", detail: "Your wallet was not credited. You can try again from your wallet." },
};

/** Decorative animation only; the status text carries the accessible state. */
export function PaymentVisual({ state = "processing", label }: { state?: PaymentVisualState; label?: string }) {
  const text = labels[state];
  return (
    <div className="payment-visual" data-state={state}>
      <span className="payment-ring" aria-hidden="true" />
      <span className="payment-mark" aria-hidden="true">
        <LogoMark tone="onDark" className="h-14 w-14" />
      </span>
      <span className="payment-badge" aria-hidden="true">
        {state === "success" ? <Check className="h-4 w-4" strokeWidth={2.4} /> : state === "failed" ? <X className="h-4 w-4" strokeWidth={2.4} /> : <span className="payment-dots"><i /><i /><i /></span>}
      </span>
      <p className="sr-only" role="status" aria-live="polite">{label ?? text.title}</p>
    </div>
  );
}

export function PaymentProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-white px-6 text-[#0A0B0D]" role="status" aria-live="polite">
      <PaymentVisual state="processing" label="Processing your payment. Please wait." />
      <div className="text-center">
        <p className="text-[20px] font-semibold tracking-[-0.03em] sm:text-[24px]">Processing your payment…</p>
        <p className="mt-1.5 text-[12px] text-[#6E7178]">Please wait, do not close this page.</p>
      </div>
      <div className="payment-pulse-dots" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}
