import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Privacy notice (draft)",
  description:
    "Draft BUYBIZ privacy notice covering account data, wallet records, payments, support, cookies, retention and your rights.",
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope and responsibility",
    content: (
      <>
        <p>
          This draft notice explains how BUYBIZ intends to handle personal data
          collected through this website, its dashboards and related support
          channels. The legal entity responsible for the data, its registration
          details and a formal privacy contact must be confirmed before launch.
        </p>
        <p>
          This notice does not cover third-party websites or services that BUYBIZ
          links to. Their own privacy notices apply.
        </p>
      </>
    ),
  },
  {
    id: "data-collected",
    title: "Personal data we collect",
    content: (
      <>
        <ul>
          <li>
            <strong>Account data:</strong> username, display name, email address,
            account status, role and authentication identifiers. Passwords are
            handled by the authentication provider; BUYBIZ does not store your
            plaintext password.
          </li>
          <li>
            <strong>Wallet and order data:</strong> wallet balance history,
            deposits, orders, refunds, proxy allocations and their expiry.
          </li>
          <li>
            <strong>Payment data:</strong> payment provider references, amount,
            currency, status, channel and processing fee metadata. BUYBIZ does
            not receive or store full card numbers.
          </li>
          <li>
            <strong>Support data:</strong> ticket subject, messages, contact form
            submissions and correspondence.
          </li>
          <li>
            <strong>Technical and security data:</strong> IP address and
            user-agent where needed for fraud prevention, rate limiting, audit
            logs and security investigations.
          </li>
          <li>
            <strong>Preferences:</strong> theme choice, stored in a cookie in your
            browser.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use personal data",
    content: (
      <>
        <ul>
          <li>Create and secure your account and authenticate sign-in attempts.</li>
          <li>Maintain wallet, order, allocation and refund records.</li>
          <li>Verify payments and reconcile them against pending deposits.</li>
          <li>Enforce proxy seat capacity, expiry and fraud safeguards.</li>
          <li>Respond to support tickets and contact messages.</li>
          <li>Prevent abuse, investigate security incidents and maintain audit logs.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
        <p>
          BUYBIZ does not sell personal data and does not use wallet or order data
          to fabricate analytics or testimonials.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments and financial providers",
    content: (
      <>
        <p>
          Wallet deposits are processed by Paystack when configured for the
          deployment. Paystack receives the payment information you provide on its
          hosted checkout and returns verification data to BUYBIZ. Card details
          are handled by the payment provider and are not sent to BUYBIZ servers.
        </p>
        <p>
          BUYBIZ stores payment references, amounts, status and limited gateway
          metadata so it can reconcile wallet credits and support disputes.
        </p>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "Service providers and sharing",
    content: (
      <>
        <p>
          BUYBIZ uses service providers for authentication and database hosting
          (Supabase), application hosting (Render) and payments (Paystack), and may
          use an email provider if email notifications are configured. These
          providers process data on their own terms and may operate outside
          Nigeria.
        </p>
        <p>
          BUYBIZ may disclose data where legally required, where necessary to
          protect users or the service, or in connection with a lawful transfer of
          the business. The final legal notice must document any cross-border
          transfer safeguards.
        </p>
      </>
    ),
  },
  {
    id: "basis",
    title: "Legal bases",
    content: (
      <>
        <p>
          Depending on the processing activity, BUYBIZ relies on performance of a
          contract with you, compliance with legal obligations, legitimate
          interests such as security and fraud prevention, and consent where
          required. The draft must be reviewed against the Nigeria Data Protection
          Act 2023 and any applicable regulations.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    content: (
      <>
        <p>
          BUYBIZ uses strictly necessary cookies for authentication sessions and a
          preference cookie for your dashboard theme. The service does not
          currently run advertising or third-party behavioural tracking scripts.
        </p>
        <p>
          If analytics or additional cookies are introduced, this notice and any
          required consent mechanism must be updated before they are enabled.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention",
    content: (
      <>
        <p>
          Account data is kept while the account is active and for a reasonable
          period afterwards. Financial ledger, order, allocation, deposit, refund
          and audit records may be retained longer to satisfy accounting, fraud
          prevention, dispute and legal requirements. Ledger entries are
          append-only; corrections are recorded as new entries.
        </p>
        <p>
          Specific retention periods should be documented after consultation with
          the owner's legal and accounting advisers.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <p>
          BUYBIZ uses server-side authorization checks, row-level security on
          exposed database tables, rate limits, HTTPS and encrypted storage for
          proxy credentials. Access to production secrets is restricted to the
          hosting environment. No system can guarantee absolute security.
        </p>
        <p>
          Do not share your password, session cookie or proxy credentials with
          anyone. Contact BUYBIZ if you believe your account has been compromised.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    content: (
      <>
        <p>
          Subject to applicable law, you may request access to your personal data,
          correction of inaccurate data, deletion where legally permitted,
          restriction of certain processing, or object to processing based on
          legitimate interests. You may also withdraw consent where processing
          relies on consent.
        </p>
        <p>
          Requests can be sent through the contact page. Identity verification may
          be required. You may also have the right to complain to the Nigeria Data
          Protection Commission or another competent authority. The final notice
          must confirm the official contact route and response process.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <>
        <p>
          BUYBIZ is not intended for children. Accounts should not be created by
          anyone under the age required to form a binding contract in their
          jurisdiction. The final notice should specify the age threshold after
          legal review.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    content: (
      <>
        <p>
          This draft will change before launch and may change afterwards. Material
          changes should be notified through the website or account dashboard. The
          latest effective date will be displayed clearly.
        </p>
        <p>
          For privacy questions, use the <a href="/contact">contact page</a>. Do
          not include government identity numbers or full card details in a
          message.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      kind="Privacy"
      title="Privacy notice."
      description="How BUYBIZ intends to collect, use, store and protect personal data across accounts, wallet records, payments and support. This is a draft for legal review."
      updated="November 2026"
      sections={sections}
    />
  );
}
