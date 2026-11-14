import "server-only";

export type EmailType =
  | "signup_verification"
  | "welcome"
  | "deposit_confirmation"
  | "referral_joined"
  | "referral_qualified"
  | "referral_reward"
  | "ambassador_promotion"
  | "ambassador_commission"
  | "payout_requested"
  | "payout_approved"
  | "payout_rejected"
  | "payout_paid"
  | "deposit_followup"
  | "campaign_customer_reward"
  | "campaign_referrer_reward"
  | "campaign_payout_requested"
  | "campaign_payout_approved"
  | "campaign_payout_paid"
  | "campaign_payout_rejected"
  | "marketing";

export type EmailTemplateData = {
  name?: string;
  amountLabel?: string;
  balanceLabel?: string;
  referralName?: string;
  commissionLabel?: string;
  availableLabel?: string;
  thresholdLabel?: string;
  progress?: string;
  code?: string;
  expiresMinutes?: number;
  address?: string;
  txHash?: string;
  reason?: string;
  requestedAt?: string;
  campaignSubject?: string;
  campaignMessage?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  campaignName?: string;
  rewardLabel?: string;
  payoutDate?: string;
  statusLabel?: string;
  customerReward?: string;
  windowLabel?: string;
};

export type EmailTemplateOverride = {
  subject: string;
  preheader: string;
  intro: string;
};

const BRAND = {
  ink: "#0A0B0D",
  paper: "#F4F4F5",
  muted: "#6E7178",
  line: "#E7E7E9",
  green: "#16794A",
};

const DEFAULT_TEMPLATES: Record<
  EmailType,
  { subject: string; preheader: string; intro: string }
> = {
  signup_verification: {
    subject: "Your BUYBIZ verification code",
    preheader: "Use this code to verify your email.",
    intro: "Enter this code to verify your email and finish setting up your BUYBIZ account.",
  },
  welcome: {
    subject: "Welcome to BUYBIZ",
    preheader: "Your account is verified. Here is what happens next.",
    intro: "We are glad you are here. BUYBIZ gives you a simple way to buy the proxy access you need, with clear prices and real support.",
  },
  deposit_confirmation: {
    subject: "Your BUYBIZ wallet is funded",
    preheader: "Your deposit has been verified.",
    intro: "Your payment has been verified and added to your BUYBIZ wallet. Here are the details.",
  },
  referral_joined: {
    subject: "Someone joined BUYBIZ with your link",
    preheader: "Your referral has been recorded.",
    intro: "Good news: someone signed up with your referral link. Their progress is now visible in your referral dashboard.",
  },
  referral_qualified: {
    subject: "Your referral made a qualifying deposit",
    preheader: "Your friend has met the referral requirement.",
    intro: "Your friend has completed the qualifying deposit. We are checking and crediting your referral reward now.",
  },
  referral_reward: {
    subject: "Your referral reward is in",
    preheader: "1,000 wallet credits have been added.",
    intro: "Your referral reward has landed in your BUYBIZ wallet. Thank you for sharing BUYBIZ with someone you know.",
  },
  ambassador_promotion: {
    subject: "You are now a BUYBIZ Ambassador",
    preheader: "Your referral work has unlocked Ambassador status.",
    intro: "You have qualified for the BUYBIZ Ambassador Programme. Your separate USD earnings balance is now active.",
  },
  ambassador_commission: {
    subject: "You earned an ambassador commission",
    preheader: "A referral completed the qualifying task.",
    intro: "A referral has completed the ambassador qualifying task, and your commission has been added to your USD balance.",
  },
  payout_requested: {
    subject: "We received your payout request",
    preheader: "Your USDT payout is queued for review.",
    intro: "Your payout request is in. We will review it and keep you updated as the status changes.",
  },
  payout_approved: {
    subject: "Your payout is being processed",
    preheader: "Your USDT payout was approved.",
    intro: "Your payout has been approved. We are preparing the USDT transfer to your BEP20 address.",
  },
  payout_rejected: {
    subject: "Your payout request needs attention",
    preheader: "Your payout was not approved this time.",
    intro: "We could not approve this payout request. Your reserved amount has been returned to your available ambassador balance.",
  },
  payout_paid: {
    subject: "Your USDT payout has been sent",
    preheader: "The transfer has been completed.",
    intro: "Your ambassador payout has been sent. The transaction hash is included below for your records.",
  },
  campaign_customer_reward: {
    subject: "You earned $10 — your BUYBIZ reward is in",
    preheader: "Your qualifying deposit and purchase counted.",
    intro: "Your qualifying deposit and eligible purchase earned a campaign reward. It sits in USD Rewards, separate from your BUYBIZ wallet balance.",
  },
  campaign_referrer_reward: {
    subject: "You both win — your $10 referral reward is in",
    preheader: "A referral completed both qualifying steps.",
    intro: "Someone you referred completed the qualifying deposit and purchase during the campaign. Your separate referrer reward has been recorded, and they earned $10 too.",
  },
  campaign_payout_requested: {
    subject: "Payout request received — pending review",
    preheader: "We received your campaign payout request.",
    intro: "Your campaign reward payout has been requested and is waiting for manual review. No crypto payment has been sent yet.",
  },
  campaign_payout_approved: {
    subject: "Approved — your USDT payout is being processed",
    preheader: "Your BEP20 payout is moving forward.",
    intro: "Your campaign reward payout has been approved for manual processing. We will email you again when the transfer is complete.",
  },
  campaign_payout_paid: {
    subject: "Paid — your USDT BEP20 transfer is complete",
    preheader: "The BEP20 transfer is complete.",
    intro: "Your campaign reward payout has been marked paid. Keep the transaction hash below for your records.",
  },
  campaign_payout_rejected: {
    subject: "Your USD reward payout needs attention",
    preheader: "Your campaign payout request was rejected.",
    intro: "Your campaign payout request was not approved. The reserved reward has been released back to your available USD rewards.",
  },
  deposit_followup: {
    subject: "Ready to try BUYBIZ?",
    preheader: "Your account is set up. Your first deposit is the next step.",
    intro: "You are all set up. When you are ready, add at least ₦2,000 to your wallet and choose the proxy plan that fits your work.",
  },
  marketing: {
    subject: "A little something from BUYBIZ",
    preheader: "A BUYBIZ update for you.",
    intro: "Here is what is happening at BUYBIZ.",
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function interpolate(template: string, data: EmailTemplateData) {
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, data.name ?? "there")
    .replace(/\{\{\s*amount\s*\}\}/gi, data.amountLabel ?? "")
    .replace(/\{\{\s*referral\s*\}\}/gi, data.referralName ?? "your referral")
    .replace(/\{\{\s*commission\s*\}\}/gi, data.commissionLabel ?? "")
    .replace(/\{\{\s*available\s*\}\}/gi, data.availableLabel ?? "");
}

function button(label: string, href: string, tone: "dark" | "light" = "dark") {
  const background = tone === "dark" ? BRAND.ink : "#FFFFFF";
  const color = tone === "dark" ? "#FFFFFF" : BRAND.ink;
  const border = tone === "dark" ? BRAND.ink : BRAND.line;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px;">
    <tr><td style="border-radius:10px;background:${background};border:1px solid ${border};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;line-height:1;color:${color};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function rewardChip(label: string, value: string, accent: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;">
    <tr><td style="border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:12px 16px;background:rgba(255,255,255,0.06);">
      <span style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,0.55);">${escapeHtml(label)}</span>
      <span style="display:block;margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.6px;color:${accent};">${escapeHtml(value)}</span>
    </td></tr>
  </table>`;
}

function campaignBanner(input: {
  eyebrow: string;
  headline: string;
  customerLabel: string;
  customerValue: string;
  referrerLabel: string;
  referrerValue: string;
  windowLabel: string;
}) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 4px;background:#0A0B0D;background-image:linear-gradient(140deg,#0A0B0D 0%,#221109 100%);border-radius:16px;overflow:hidden;">
    <tr><td style="padding:26px 24px;">
      <span style="display:inline-block;padding:5px 10px;border:1px solid rgba(255,138,104,0.45);border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#FFB197;">${escapeHtml(input.eyebrow)}</span>
      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;line-height:1.1;letter-spacing:-1px;color:#FFFFFF;">${escapeHtml(input.headline)}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:18px;">
        <tr>
          <td width="48%" style="padding-right:4px;">${rewardChip(input.customerLabel, input.customerValue, "#8EE7B8")}</td>
          <td width="4%"></td>
          <td width="48%" style="padding-left:4px;">${rewardChip(input.referrerLabel, input.referrerValue, "#FFB197")}</td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.4px;color:rgba(255,255,255,0.6);">${escapeHtml(input.windowLabel)}</p>
    </td></tr>
  </table>`;
}

function campaignSteps(rows: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 4px;">
    ${rows
      .map(
        ([number, text], index) => `<tr>
          <td style="padding:${index === 0 ? "0 0 12px" : "12px 0"};">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
              <td style="width:30px;height:30px;line-height:30px;text-align:center;border-radius:50%;background:#0A0B0D;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;">${escapeHtml(number)}</td>
              <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#4E5157;">${escapeHtml(text)}</td>
            </tr></table>
          </td>
        </tr>`,
      )
      .join("")}
  </table>`;
}

function details(rows: Array<[string, string]>) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:18px 0 8px;border:1px solid ${BRAND.line};border-radius:10px;border-collapse:separate;overflow:hidden;">
    ${rows
      .map(
        ([label, value], index) => `<tr>
          <td style="padding:11px 14px;background:${index % 2 ? "#FFFFFF" : "#FAFAFB"};border-bottom:${index === rows.length - 1 ? "0" : `1px solid ${BRAND.line}`};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.muted};">${escapeHtml(label)}</td>
          <td align="right" style="padding:11px 14px;background:${index % 2 ? "#FFFFFF" : "#FAFAFB"};border-bottom:${index === rows.length - 1 ? "0" : `1px solid ${BRAND.line}`};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${BRAND.ink};">${escapeHtml(value)}</td>
        </tr>`,
      )
      .join("")}
  </table>`;
}

function layout(input: {
  title: string;
  preheader: string;
  intro: string;
  content: string;
  footerNote?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  websiteUrl: string;
  supportEmail: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.paper};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.ink};padding:22px 26px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td>
                  <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#FFFFFF;color:${BRAND.ink};border-radius:9px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:900;letter-spacing:-1px;">B</span>
                  <span style="display:inline-block;margin-left:9px;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:-0.6px;color:#FFFFFF;">BUYBIZ</span>
                </td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,0.42);">Proxy access, simplified</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:32px 30px 26px;">
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${BRAND.green};">BUYBIZ update</p>
          <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:27px;line-height:1.15;letter-spacing:-1.1px;color:${BRAND.ink};">${escapeHtml(input.title)}</h1>
          <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4E5157;">${escapeHtml(input.intro)}</p>
          ${input.content}
          <p style="margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#4E5157;">Warmly,<br><strong style="color:${BRAND.ink};">The BUYBIZ team</strong></p>
        </td></tr>
        <tr>
          <td style="padding:20px 30px;background:#FAFAFB;border-top:1px solid ${BRAND.line};">
            ${
              input.footerNote
                ? `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(input.footerNote)}</p>`
                : ""
            }
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${BRAND.muted};">
              <a href="${escapeHtml(input.websiteUrl)}" style="color:${BRAND.ink};text-decoration:underline;">buybiz.store</a>
              &nbsp;·&nbsp;
              <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:${BRAND.ink};text-decoration:underline;">${escapeHtml(input.supportEmail)}</a>
            </p>
            <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;color:#9A9DA3;">
              You are receiving this service message because you have a BUYBIZ account.
              ${
                input.preferencesUrl
                  ? `<a href="${escapeHtml(input.preferencesUrl)}" style="color:#6E7178;text-decoration:underline;">Manage email preferences</a>.`
                  : ""
              }
              ${
                input.unsubscribeUrl
                  ? `<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6E7178;text-decoration:underline;">Unsubscribe from marketing</a>.`
                  : ""
              }
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#9A9DA3;">© ${new Date().getFullYear()} BUYBIZ. NGN prices. Proxy access is subject to availability.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function textLayout(input: {
  title: string;
  intro: string;
  content: string;
  websiteUrl: string;
  supportEmail: string;
  preferencesUrl?: string;
  unsubscribeUrl?: string;
}) {
  return [
    "BUYBIZ",
    "",
    input.title,
    "",
    input.intro,
    "",
    input.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    "",
    "Warmly,",
    "The BUYBIZ team",
    "",
    `Website: ${input.websiteUrl}`,
    `Support: ${input.supportEmail}`,
    input.preferencesUrl ? `Manage email preferences: ${input.preferencesUrl}` : "",
    input.unsubscribeUrl ? `Unsubscribe from marketing: ${input.unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderEmail(input: {
  type: EmailType;
  data: EmailTemplateData;
  template?: EmailTemplateOverride;
  websiteUrl: string;
  supportEmail: string;
  preferencesUrl?: string;
  unsubscribeUrl?: string;
}) {
  const template = input.template ?? DEFAULT_TEMPLATES[input.type];
  const subject = interpolate(template.subject, input.data);
  const intro = interpolate(template.intro, input.data);
  const data = input.data;
  let content = "";

  switch (input.type) {
    case "signup_verification":
      content = `<div style="margin:22px 0;padding:20px;border:1px solid ${BRAND.line};border-radius:12px;background:#FAFAFB;text-align:center;">
        <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.muted};">Your verification code</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:800;letter-spacing:8px;color:${BRAND.ink};">${escapeHtml(data.code ?? "")}</p>
        <p style="margin:9px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.muted};">This code expires in ${escapeHtml(String(data.expiresMinutes ?? 10))} minutes.</p>
      </div>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">If you did not create a BUYBIZ account, you can safely ignore this email. Never share this code with anyone.</p>`;
      break;
    case "welcome":
      content = `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.75;color:#4E5157;">Your account is ready. Add funds from ₦1,500, choose a proxy plan, and your connection details will appear in My Proxies.</p>
      ${button("Open your dashboard", `${input.websiteUrl}/dashboard`)}
      <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">Not sure which plan fits? Reply to this email and a real person will help you choose.</p>`;
      break;
    case "deposit_confirmation":
      content = `${details([
        ["Amount deposited", data.amountLabel ?? ""],
        ["New wallet balance", data.balanceLabel ?? ""],
        ["Status", "Verified and credited"],
      ])}
      ${button("Open your wallet", `${input.websiteUrl}/dashboard/wallet`)}`;
      break;
    case "referral_joined":
      content = `${data.referralName ? `<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#4E5157;"><strong>${escapeHtml(data.referralName)}</strong> joined with your link.</p>` : ""}
      ${button("View referral progress", `${input.websiteUrl}/dashboard/referrals`)}`;
      break;
    case "referral_qualified":
      content = `${details([
        ["Referral", data.referralName ?? "Your friend"],
        ["Qualifying deposit", data.amountLabel ?? "₦2,000"],
        ["Next step", "Your ₦1,000 wallet reward"],
      ])}
      ${button("See your referrals", `${input.websiteUrl}/dashboard/referrals`)}`;
      break;
    case "referral_reward":
      content = `${details([
        ["Reward credited", data.amountLabel ?? "₦1,000"],
        ["Where it went", "Your BUYBIZ wallet"],
        ["Updated balance", data.balanceLabel ?? ""],
      ])}
      ${button("Open your wallet", `${input.websiteUrl}/dashboard/wallet`)}`;
      break;
    case "ambassador_promotion":
      content = `${details([
        ["Status", "BUYBIZ Ambassador"],
        ["Qualified referrals", data.progress ?? ""],
        ["Commission", data.commissionLabel ?? "$3 per qualifying referral"],
        ["Payout minimum", data.thresholdLabel ?? "$10 USDT"],
      ])}
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">There is no cap on qualified referrals. Your ambassador earnings are tracked in USD, separately from your naira wallet credits.</p>
      ${button("Open your ambassador dashboard", `${input.websiteUrl}/dashboard/referrals`)}`;
      break;
    case "ambassador_commission":
      content = `${details([
        ["Commission earned", data.commissionLabel ?? "$3.00"],
        ["Available balance", data.availableLabel ?? ""],
        ["Referral", data.referralName ?? "Qualifying referral"],
      ])}
      ${button("View ambassador earnings", `${input.websiteUrl}/dashboard/referrals`)}`;
      break;
    case "payout_requested":
      content = `${details([
        ["Amount requested", data.amountLabel ?? ""],
        ["Payout method", "USDT · BEP20"],
        ["Wallet address", data.address ?? ""],
        ["Requested", data.requestedAt ?? ""],
        ["Estimated processing", "Up to 3 days after request"],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">We will email you again when the status changes. Your requested amount is reserved while the payout is open.</p>`;
      break;
    case "payout_approved":
      content = `${details([
        ["Amount", data.amountLabel ?? ""],
        ["Status", "Approved and processing"],
        ["Network", "BNB Smart Chain (BEP20)"],
        ["Estimated processing", "Up to 3 days"],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">We are preparing the transfer. No action is needed from you right now.</p>`;
      break;
    case "payout_rejected":
      content = `${details([
        ["Amount", data.amountLabel ?? ""],
        ["Status", "Rejected"],
        ["Reason", data.reason ?? "Please contact support for details."],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">The reserved amount has been returned to your available ambassador balance. You can request another payout when ready.</p>
      ${button("Review your balance", `${input.websiteUrl}/dashboard/referrals`)}`;
      break;
    case "payout_paid":
      content = `${details([
        ["Amount", data.amountLabel ?? ""],
        ["Status", "Paid"],
        ["Network", "BNB Smart Chain (BEP20)"],
        ["Transaction hash", data.txHash ?? ""],
        ["Wallet address", data.address ?? ""],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">Keep this email for your records. You can verify the transfer using the transaction hash on BscScan.</p>`;
      break;
    case "deposit_followup":
      content = `${button("Add funds to your wallet", `${input.websiteUrl}/dashboard/wallet`)}
      ${details([
        ["Minimum deposit", "₦1,500"],
        ["Credit value", "1 credit = ₦1"],
        ["Available plans", "From ₦500"],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">No pressure at all. Your account will be here whenever you are ready.</p>`;
      break;
    case "campaign_customer_reward":
      content = `${campaignBanner({
        eyebrow: "Reward unlocked",
        headline: "You just earned $10.",
        customerLabel: "Your reward",
        customerValue: data.rewardLabel ?? "$10.00",
        referrerLabel: "Payout date",
        referrerValue: data.payoutDate ?? "24 December 2026",
        windowLabel: "USD rewards · USDT BEP20 · separate from your naira wallet",
      })}
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#4E5157;">Your qualifying deposit and eligible purchase counted. Add and verify a BEP20 address in Rewards, and request your payout after ${escapeHtml(data.payoutDate ?? "the scheduled payout date")}.</p>
      ${button("Open USD Rewards", `${input.websiteUrl}/dashboard/referrals?tab=rewards`)}`;
      break;
    case "campaign_referrer_reward":
      content = `${campaignBanner({
        eyebrow: "You both win",
        headline: `${escapeHtml(data.referralName ?? "Your friend")} just unlocked your $10.`,
        customerLabel: "Your reward",
        customerValue: data.rewardLabel ?? "$10.00",
        referrerLabel: "Payout date",
        referrerValue: data.payoutDate ?? "24 December 2026",
        windowLabel: "The qualifying customer received $10 too — both sides are rewarded.",
      })}
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#4E5157;">Your link is still working. Every new qualifying referral during the campaign earns another $10.</p>
      ${button("Share your invite link", `${input.websiteUrl}/dashboard/referrals?tab=referrals`)}
      ${button("Open USD Rewards", `${input.websiteUrl}/dashboard/referrals?tab=rewards`, "light")}`;
      break;
    case "campaign_payout_requested":
      content = `${details([
        ["Amount requested", data.amountLabel ?? ""],
        ["Status", "Pending Review"],
        ["Network", "USDT · BNB Smart Chain (BEP20)"],
        ["Wallet address", data.address ?? ""],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">No payment has been sent yet. An administrator will review the request and update the status in your Rewards section.</p>`;
      break;
    case "campaign_payout_approved":
      content = `${details([
        ["Amount", data.amountLabel ?? ""],
        ["Status", "Approved · processing"],
        ["Network", "USDT · BNB Smart Chain (BEP20)"],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">Your payout is approved for manual processing. You will receive another email when the transfer is complete and the transaction hash is recorded.</p>`;
      break;
    case "campaign_payout_paid":
      content = `${details([
        ["Amount", data.amountLabel ?? ""],
        ["Status", "Paid"],
        ["Network", "USDT · BNB Smart Chain (BEP20)"],
        ["Transaction hash", data.txHash ?? ""],
        ["Wallet address", data.address ?? ""],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">Keep this email for your records. You can verify the transfer with the transaction hash on BscScan.</p>`;
      break;
    case "campaign_payout_rejected":
      content = `${details([
        ["Amount", data.amountLabel ?? ""],
        ["Status", "Rejected"],
        ["Reason", data.reason ?? "Please contact support for details."],
      ])}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.muted};">The reserved reward has been returned to your available USD rewards. You can review your balance and request a payout again when eligible.</p>
      ${button("Review USD rewards", `${input.websiteUrl}/dashboard/referrals?tab=rewards`)}`;
      break;
    case "marketing":
      content = `${campaignBanner({
        eyebrow: "Limited-time referral campaign",
        headline: "Give $10. Get $10.",
        customerLabel: "Your friend earns",
        customerValue: data.customerReward ?? "$10.00",
        referrerLabel: "You earn",
        referrerValue: data.rewardLabel ?? "$10.00",
        windowLabel: data.windowLabel ?? "20 November – 23 December 2026 · Payout 24 December 2026",
      })}
      ${campaignSteps([
        ["1", "Send your referral link to a friend."],
        ["2", "They deposit at least ₦2,000 and buy a proxy during the campaign."],
        ["3", "You both earn $10 in separate USD rewards."],
      ])}
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${BRAND.muted};">One reward per qualifying customer. Failed, refunded or fraudulent activity never counts. No fake participation numbers — only real qualifying referrals.</p>
      ${button("Share your invite link", `${input.websiteUrl}/dashboard/referrals?tab=referrals`)}
      ${button("See campaign rules", `${input.websiteUrl}/campaigns/customer-referrer-10`, "light")}`;
      break;
  }

  const html = layout({
    title: subject,
    preheader: template.preheader,
    intro,
    content,
    footerNote:
      input.type === "marketing"
        ? "You are receiving this because you opted in to BUYBIZ marketing emails."
        : "This is a service message about your BUYBIZ account.",
    unsubscribeUrl: input.unsubscribeUrl,
    preferencesUrl: input.preferencesUrl,
    websiteUrl: input.websiteUrl,
    supportEmail: input.supportEmail,
  });
  const text = textLayout({
    title: subject,
    intro,
    content,
    websiteUrl: input.websiteUrl,
    supportEmail: input.supportEmail,
    preferencesUrl: input.preferencesUrl,
    unsubscribeUrl: input.unsubscribeUrl,
  });
  return { subject, html, text, preheader: template.preheader };
}

export const EMAIL_TYPES = Object.keys(DEFAULT_TEMPLATES) as EmailType[];
export { DEFAULT_TEMPLATES };
