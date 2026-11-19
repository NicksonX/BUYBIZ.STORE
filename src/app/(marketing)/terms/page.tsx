import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "BUYBIZ terms covering the proxy service, accounts, wallet credit, payments, shared capacity, expiry, refunds, referrals, campaigns and acceptable use.",
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About BUYBIZ and these terms",
    content: (
      <>
        <p>
          BUYBIZ is an online platform offering fixed-duration, subscription-style
          proxy access to individuals and businesses. These terms govern your use
          of BUYBIZ and the related website, customer dashboard, wallet and
          support services. By creating an account or using BUYBIZ, you agree to
          these terms and the Privacy Notice. If you do not agree, do not use the
          service.
        </p>
        <p>
          The normal customer journey is:
        </p>
        <ol>
          <li>Browse the proxy plans and check current availability.</li>
          <li>Create an account and complete the required verification.</li>
          <li>Fund the BUYBIZ wallet through the configured payment provider.</li>
          <li>Select an available proxy plan and confirm the wallet purchase.</li>
          <li>Receive the assigned proxy connection details in the dashboard.</li>
          <li>Configure those details in a compatible browser, computer, mobile device or application.</li>
          <li>Route internet traffic through the relevant proxy server while the plan is active.</li>
        </ol>
        <p>
          Proxy connection details may include a hostname or IP address, port,
          username and password. They are access credentials, not a guarantee of
          anonymity, unrestricted access or a particular geographic result.
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
          You must create an account using one of the authentication methods
          offered by BUYBIZ, provide a unique username where requested, keep your
          email address current, and complete any verification required before
          purchasing proxy access or funding a wallet. Existing email-and-password
          customers may continue to use the sign-in option available to them.
        </p>
        <ul>
          <li>You must be legally able to enter into a contract in your jurisdiction.</li>
          <li>One person may not impersonate another person or BUYBIZ staff.</li>
          <li>You are responsible for keeping your sign-in method, device and account secure.</li>
          <li>You are responsible for activity carried out through your BUYBIZ account.</li>
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
          Balances are derived from a ledger and cannot be edited from the browser.
        </p>
        <p>
          No taxes or BUYBIZ platform fees are added to the displayed plan prices.
          Payment-provider charges, if any, are governed by that provider&apos;s
          terms and may be displayed at checkout.
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
          credentials and outgoing IP. Shared capacity is enforced by the platform
          and is not advertised as a fixed public user count.
        </p>
        <p>
          The Personal 30-Day Proxy is allocated to one active customer per
          proxy, and a customer may hold only one active Personal 30-Day Proxy
          at a time. It does not promise a dedicated IP unless the assigned
          inventory actually provides one.
        </p>
        <p>
          Shared plans use a shared proxy product. BUYBIZ does not promise a dedicated IP,
          a unique upstream username or password for each customer, or a
          particular geographic location unless the assigned inventory actually
          provides it.
        </p>
        <p>
          Packaged access does not renew automatically. While an allocation is
          active, the customer may choose to renew it manually. A renewal is a
          fresh wallet purchase, extends the expiry by the same access window,
          and is subject to wallet balance, upstream lifetime and availability.
        </p>
        <p>
          You must not use the proxy for unlawful activity, fraud, harassment,
          unauthorised access, spam, malware, evasion of lawful enforcement or any
          use that violates an upstream supplier&apos;s terms or applicable law.
        </p>
      </>
    ),
  },
  {
    id: "legitimate-use",
    title: "Legitimate uses",
    content: (
      <>
        <p>
          Subject to applicable law, third-party terms and the restrictions in
          these terms, BUYBIZ proxy access is intended to support legitimate uses
          such as:
        </p>
        <ul>
          <li>Online privacy and the use of an alternative IP address.</li>
          <li>Legitimate business operations and remote working.</li>
          <li>Testing websites, applications and services from another location.</li>
          <li>Checking how a location-based website or service appears.</li>
          <li>General browsing through a supported proxy connection.</li>
        </ul>
        <p>
          BUYBIZ does not guarantee anonymity, privacy, unrestricted access,
          availability of a particular website or service, or that a third-party
          service will permit proxy access. You remain responsible for complying
          with the terms of any website or service you use.
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
          connection details. Ending one customer&apos;s entitlement does not change
          another customer&apos;s allocation or expiry.
        </p>
        <p>
          Because upstream credentials are shared, database expiry is not
          equivalent to technical network revocation. BUYBIZ does not claim that
          it can individually revoke one customer&apos;s shared credential unless a
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
          back to the customer&apos;s BUYBIZ wallet in a linked ledger entry. The
          customer is not left charged.
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
          BUYBIZ may offer standard referral rewards and separate promotional
          campaigns. Customers may invite other people through the approved
          referral link or code shown in their dashboard.
        </p>
        <p>
          A registration or referral alone does not automatically earn a reward.
          The referred customer must satisfy the eligibility conditions for the
          relevant programme, including any required successful wallet deposit and
          qualifying proxy purchase. The applicable requirements and current
          reward amount are shown on the{" "}
          <Link href="/dashboard/referrals">referral page</Link> when the referral
          qualifies.
        </p>
        <p>
          Failed, cancelled or refunded purchases do not qualify. Internal
          transfers, refunds, admin credits and adjustments are never qualifying
          purchases. Only one standard reward is available for each referred
          customer. Self-referrals, duplicate accounts, fake accounts and
          coordinated abuse are not eligible. BUYBIZ may review, reject or reverse
          a reward connected to abuse.
        </p>
        <p>
          Standard referral credit is subject to the same non-withdrawal rule as
          other wallet credit. It can be used for BUYBIZ purchases only. Promotional
          campaign rewards are separate and are governed by the applicable campaign
          terms.
        </p>
      </>
    ),
  },
  {
    id: "campaigns",
    title: "Promotional and referral campaigns",
    content: (
      <>
        <p>
          BUYBIZ may run promotional or referral campaigns. Each campaign is
          governed by its official campaign page and any campaign-specific rules,
          which supplement these terms. Campaign dates, reward amounts, payout
          dates and eligibility conditions are those published for that campaign;
          they are not implied by general referral wording.
        </p>
        <p>
          A referral or registration does not guarantee a campaign reward.
          Qualifying purchases, deposits, timing and any other published
          conditions must be satisfied. Campaign rewards may be recorded separately
          from normal referral rewards and may have different payout or review
          requirements.
        </p>
        <p>
          Duplicate, fraudulent, manipulated, coordinated or abusive referrals and
          purchases are prohibited. BUYBIZ may investigate suspected campaign
          abuse, hold a reward while it reviews evidence, and reject or reverse a
          reward where the published conditions are not met or abuse is found.
        </p>
        <p>
          Campaign rules may be updated for a future campaign. The rules published
          for the campaign at the relevant time apply to that campaign. See the
          official{" "}
          <Link href="/dashboard/campaigns">campaign page</Link> for current rules.
        </p>
      </>
    ),
  },
  {
    id: "prohibited-use",
    title: "Responsible use and prohibited activity",
    content: (
      <>
        <p>You must not use BUYBIZ to:</p>
        <ul>
          <li>Violate any applicable law, regulation, court order or third-party rights.</li>
          <li>Commit fraud, launder money, evade sanctions or finance illegal activity.</li>
          <li>Commit identity theft or impersonate any person or organisation.</li>
          <li>Access an account, system or network without authorisation.</li>
          <li>Launch cyberattacks, distribute malware, scan or abuse networks, or interfere with another service.</li>
          <li>Carry out illegal transactions or abuse a third-party website, application or service.</li>
          <li>Harass, threaten, defraud or intentionally cause harm to any person.</li>
          <li>Bypass platform verification, bans or access controls unlawfully.</li>
          <li>Resell shared access without written permission or misrepresent it as dedicated.</li>
          <li>Use the service for any other unlawful or prohibited purpose.</li>
        </ul>
        <p>
          BUYBIZ may investigate suspected misuse, restrict access, suspend a
          subscription or terminate an account in accordance with its policies and
          applicable law. BUYBIZ may preserve and report information where legally
          required. Where reasonably possible, BUYBIZ will explain a restriction
          and provide a route to contact support.
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
          but the service is provided on an &quot;as available&quot; basis to the extent
          permitted by applicable law. Upstream proxies are supplied by third
          parties and may experience failures outside BUYBIZ&apos;s control.
        </p>
        <p>
          BUYBIZ is not liable for indirect or consequential loss, or for a
          customer&apos;s misuse of credentials. Nothing in these terms excludes
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
          Questions about these terms or a specific account can be sent through
          the <Link href="/contact">BUYBIZ contact page</Link> or the support area
          in your dashboard. Do not send passwords, one-time codes, recovery
          phrases or private keys through support.
        </p>
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria.
          Mandatory consumer protections that apply to you are not excluded.
          Formal legal-entity details and notices must be supplied by BUYBIZ after
          legal review and are not invented here.
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
      description="The rules for the BUYBIZ proxy service, accounts, wallet credit, proxy allocation, shared capacity, expiry, refunds, referrals, campaigns and acceptable use."
      /* Preserve the original publication date exactly. */
      updated="15 November 2026"
      status="approved"
      sections={sections}
    />
  );
}
