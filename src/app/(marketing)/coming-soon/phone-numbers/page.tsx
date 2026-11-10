import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { ComingSoonDetail } from "@/components/marketing/coming-soon-detail";

export const metadata: Metadata = {
  title: "Virtual phone numbers: coming soon",
  description:
    "Virtual phone numbers are a planned BUYBIZ service. They are not available, priced or purchasable in this release.",
};

export default function PhoneNumbersComingSoonPage() {
  return (
    <ComingSoonDetail
      eyebrow="Roadmap · Virtual numbers"
      title="Virtual phone numbers."
      description="A planned service for verification and communication use cases. Nothing is available to buy today. There is no number list, coverage map, price or fake checkout."
      icon={Phone}
      scope={[
        "Evaluate whether virtual numbers can be provided through compliant, reputable suppliers.",
        "Define which countries, number types and verification use cases would actually be supported.",
        "Publish clear pricing, replacement and refund rules before opening any checkout.",
        "Complete legal and privacy review for identity and communication data.",
      ]}
      limitations={[
        "No numbers are available for purchase today.",
        "No country list, inventory count or price is being advertised.",
        "There is no waitlist or email collection for this service in this release.",
        "No payment should be sent for virtual numbers.",
      ]}
    />
  );
}
