import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of service (draft)",
  description:
    "Draft BUYBIZ terms covering accounts, wallet credit, proxy access, shared capacity, expiry, refunds and acceptable use.",
};

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "About these terms",
    content: (
      <>
        <p>
          These terms describe the intended rules for using BUYBIZ, a
          Nigeria-focused digital marketplace operated under the BUYBIZ brand.
          The legal entity, registered address and final governing-law provisions
          must be supplied and reviewed before launch.
        </p>
        <p>
          By creating an account or using the service, you agree to these terms
          and the Privacy Notice. If you do not agree, do not use BUYBIZ.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and eligibility",
    content: (
      <>
        <p>
          You must provide a unique username, a valid email address and a
          password, and you must verify your email before buying proxy access or
          funding a wallet. You are responsible for keeping your credentials
          secure and for activity under your account.
        </p>
        <ul>
          <li>One person may not impersonate another person or BUYBIZ staff.</li>
          <li>You must be legally able to enter into a contract in your jurisdiction.</li>
          <li>BUYBIZ may suspend an account for suspected fraud, abuse or illegal use.</li>
          <li>Roles and administrative permissions are assigned only through trusted server operations.</li>
        </ul>
      </>
    ),
  },
  {
    id: "wallet",
    title: "BUYBIZ wallet",
    content: (
      <>
        <p>
          The BUYBIZ wallet is an internal purchasing balance denominated in
          Nigerian naira. It is not a bank account, deposit account, e-money
          account or investment product. It does not earn interest.
        </p>
        <p>
          Wallet credit is for purchases on BUYBIZ only. In this release, there is
          no cash withdrawal, transfer-out or peer-to-peer transfer feature.
          Balances are derived from an immutable ledger and cannot be edited from
          the browser.
        </p>
        <p>
          No taxes or BUYBIZ platform fees are added to the displayed plan prices.
          Payment provider charges, if any, are governed by that provider's terms.
        </p>
      </>
    ),
  },
  {
    id: "deposits",
    title: "Deposits and payment verification",
    content: (
      <>
        <p>
          Deposits are processed through the configured payment provider. BUYBIZ
          credits a wallet only after the payment is verified on its server and
          the amount, currency and reference match the pending deposit record.
        </p>
        <p>
          A browser redirect, screenshot or client-side success message is not
          proof of payment. Duplicate callbacks and webhooks are idempotent and
          cannot credit a wallet twice. Failed, abandoned or reversed payments are
          not credited.
        </p>
        <p>
          Do not send payment to any account details that are not displayed
          through the official BUYBIZ checkout flow.
        </p>
      </>
    ),
  },
  {
    id: "proxy-service",
    title: "Proxy service and shared access",
    content: (
      <>
        <p>
          BUYBIZ sells fixed-duration access to manually supplied upstream
          proxies. Each allocation references one inventory item. Shared access
          means other active customers may use the same upstream proxy
          credentials and outgoing IP.
        </p>
        <p>
          The Personal 30-Day Proxy is allocated to one active customer per
          proxy, and a customer may hold only one active Personal 30-Day Proxy
          at a time. It does not promise a dedicated IP unless the assigned
          inventory actually provides one.
        </p>
        <p>
          Shared plans are a shared proxy product. BUYBIZ does not promise a dedicated IP,
          a unique upstream username or password for each customer, or a
          particular geographic location unless the assigned inventory actually
          provides it.
        </p>
        <p>
          You must not use the proxy for unlawful activity, fraud, harassment,
          unauthorised access, spam, malware, evading lawful enforcement or any
          use that violates an upstream supplier's terms or applicable law.
        </p>
      </>
    ),
  },
  {
    id: "allocation",
    title: "Allocation and capacity",
    content: (
      <>
        <p>
          A purchase is confirmed only when BUYBIZ can allocate a free seat on
          eligible inventory and the upstream proxy has enough remaining lifetime
          for the full package plus a safety buffer.
        </p>
        <p>
          Seat limits are enforced transactionally and by a database trigger.
          BUYBIZ does not rely on a client-side counter. Simultaneous purchases
          cannot create more than the configured active limit on one upstream proxy.
        </p>
        <p>
          BUYBIZ may use a deterministic allocation strategy, currently oldest
          eligible inventory first, unless an authorised administrator documents
          a different strategy.
        </p>
      </>
    ),
  },
  {
    id: "expiry",
    title: "Expiry and access ending",
    content: (
      <>
        <p>
          Customer access starts at successful allocation. The 24-hour package
          expires exactly 24 hours later; the 7-day and 30-day packages expire at
          exact 24-hour multiples. There is no auto-renewal.
        </p>
        <p>
          When a package ends, BUYBIZ marks the entitlement expired and hides the
          connection details. Ending one customer's entitlement does not change
          another customer's allocation or expiry.
        </p>
        <p>
          Because upstream credentials are shared, database expiry is not
          equivalent to technical network revocation. BUYBIZ does not claim that
          it can individually revoke one customer's shared credential unless a
          future gateway genuinely provides that capability.
        </p>
        <p>
          If upstream inventory expires earlier than a customer package, affected
          allocations are marked interrupted, customers are notified, and any
          remedy follows the configured policy and applicable law.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds and adjustments",
    content: (
      <>
        <p>
          If no eligible inventory exists at purchase confirmation time, BUYBIZ
          records the order with a no-stock reason and credits the full amount
          back to the customer's BUYBIZ wallet in a linked, idempotent ledger
          entry. The customer is not left charged.
        </p>
        <p>
          Refunds are internal wallet credits in this release. They are not cash
          withdrawals. Admin wallet adjustments require a reason, confirmation and
          an audit entry, and may not create a negative customer balance except
          through a specifically approved correction workflow.
        </p>
        <p>
          BUYBIZ does not count a wallet deposit as revenue and does not count a
          wallet refund as new revenue.
        </p>
      </>
    ),
  },
  {
    id: "referrals",
    title: "Referral rewards",
    content: (
      <>
        <p>
          Customers may share a referral code. A referral reward is internal
          BUYBIZ wallet credit, not cash. The standard reward is ₦1,000 and is
          credited after the referred customer makes one verified external
          deposit of at least ₦3,000.
        </p>
        <p>
          Internal transfers between users, refunds, admin credits, adjustments
          and demo credits do not qualify. Only one reward is available for each
          referred customer. Self-referrals, duplicate accounts, fake accounts
          and coordinated abuse are not eligible. BUYBIZ may review, reject or
          reverse a reward connected to abuse.
        </p>
        <p>
          Referral credit is subject to the same no-withdrawal rule as other
          wallet credit. It can be used for BUYBIZ purchases only.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Prohibited use",
    content: (
      <>
        <p>You must not use BUYBIZ to:</p>
        <ul>
          <li>Violate any applicable law, regulation or third-party rights.</li>
          <li>Commit fraud, launder money, evade sanctions or finance illegal activity.</li>
          <li>Access systems without authorisation, distribute malware or abuse networks.</li>
          <li>Harass, threaten, defraud or impersonate any person.</li>
          <li>Bypass platform verification, bans or access controls unlawfully.</li>
          <li>Resell shared access without written permission or misrepresent it as dedicated.</li>
        </ul>
        <p>
          BUYBIZ may suspend or terminate access for violations and may report
          unlawful activity where legally required.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    content: (
      <>
        <p>
          Inventory, prices, durations and service availability can change.
          Prices and capacities are displayed before confirmation. BUYBIZ does not
          guarantee uninterrupted availability, a particular inventory region, or
          that every listed plan will always be purchasable.
        </p>
        <p>
          Planned services such as virtual phone numbers and PayPal-related
          services are not part of the live offering. They have no binding launch
          date and must not be purchased or treated as available.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Disclaimers and liability",
    content: (
      <>
        <p>
          BUYBIZ aims to provide accurate information and secure record-keeping,
          but the service is provided on an “as available” basis to the extent
          permitted by applicable law. Upstream proxies are supplied by third
          parties and may experience failures outside BUYBIZ's control.
        </p>
        <p>
          BUYBIZ is not liable for indirect or consequential loss, or for a
          customer's misuse of credentials. Nothing in these draft terms excludes
          liability that cannot lawfully be excluded. The final liability,
          consumer-rights and dispute-resolution provisions require legal review.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact and governing law",
    content: (
      <>
        <p>
          Questions about these terms can be sent through the{" "}
          <a href="/contact">BUYBIZ contact page</a>. Official legal entity
          details and a formal notices address must be added before launch.
        </p>
        <p>
          These terms are intended to be governed by the laws of the Federal
          Republic of Nigeria. This governing-law statement is subject to legal
          review and does not replace mandatory consumer protections that apply to
          you.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      kind="Terms"
      title="Terms of service."
      description="The intended rules for accounts, wallet credit, proxy allocation, shared capacity, expiry and refunds. This is a draft, not a final legal document."
      updated="November 2026"
      sections={sections}
    />
  );
}
