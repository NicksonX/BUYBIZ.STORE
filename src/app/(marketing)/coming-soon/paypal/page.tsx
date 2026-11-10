import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { ComingSoonDetail } from "@/components/marketing/coming-soon-detail";

export const metadata: Metadata = {
  title: "PayPal services: coming soon",
  description:
    "PayPal-related services are a planned BUYBIZ category, not a live offering. BUYBIZ does not claim a PayPal partnership.",
};

export default function PaypalComingSoonPage() {
  return (
    <ComingSoonDetail
      eyebrow="Roadmap · PayPal"
      title="PayPal services."
      description="A planned future category. BUYBIZ does not currently offer PayPal account, payment or withdrawal services, and does not claim a PayPal partnership."
      icon={CreditCard}
      scope={[
        "Define the precise lawful scope of any PayPal-related service with the owner.",
        "Complete legal, compliance and provider-terms review before launch.",
        "Publish transparent pricing, limitations and refund rules.",
        "Only accept payment for a service that is actually operational.",
      ]}
      limitations={[
        "No PayPal service is being sold today.",
        "BUYBIZ is not a PayPal partner or authorised agent unless a real agreement says so.",
        "There is no request form or checkout for PayPal services.",
        "Do not send payment or PayPal account details for this planned service.",
      ]}
    />
  );
}
