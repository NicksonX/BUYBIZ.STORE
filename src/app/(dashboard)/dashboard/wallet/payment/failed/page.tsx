import type { Metadata } from "next";
import { PaymentStatusView } from "@/components/wallet/payment-status-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment failed",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reference = first(params.reference) || first(params.trx_ref) || first(params.trxref);
  return <PaymentStatusView reference={reference} />;
}
