import type {
  AllocationStatus,
  DepositStatus,
  LedgerEntryType,
  OrderStatus,
  TicketStatus,
} from "@/lib/db/types";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "solid"
  | "dark";

export function orderStatusMeta(status: OrderStatus): {
  label: string;
  tone: Tone;
  description: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        tone: "success",
        description: "Purchase completed and proxy allocated.",
      };
    case "refunded":
      return {
        label: "Refunded",
        tone: "warning",
        description: "Refunded to your BUYBIZ wallet.",
      };
    case "unfulfilled":
      return {
        label: "Unfulfilled",
        tone: "danger",
        description: "No proxy could be allocated.",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        tone: "neutral",
        description: "This order was cancelled.",
      };
    default:
      return {
        label: "Pending",
        tone: "info",
        description: "Waiting for completion.",
      };
  }
}

export function allocationStatusMeta(
  status: AllocationStatus | "expired_by_time" | "interrupted_by_upstream",
): { label: string; tone: Tone } {
  switch (status) {
    case "active":
      return { label: "Active", tone: "success" };
    case "expired":
    case "expired_by_time":
      return { label: "Expired", tone: "neutral" };
    case "interrupted":
    case "interrupted_by_upstream":
      return { label: "Interrupted", tone: "warning" };
    case "revoked":
      return { label: "Revoked", tone: "danger" };
  }
}

export function depositStatusMeta(status: DepositStatus): {
  label: string;
  tone: Tone;
} {
  switch (status) {
    case "credited":
      return { label: "Credited", tone: "success" };
    case "successful":
      return { label: "Verified", tone: "info" };
    case "pending":
    case "initiated":
      return { label: "Pending", tone: "warning" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "abandoned":
      return { label: "Abandoned", tone: "neutral" };
    case "reversed":
      return { label: "Reversed", tone: "danger" };
  }
}

export function ticketStatusMeta(status: TicketStatus): {
  label: string;
  tone: Tone;
} {
  switch (status) {
    case "open":
      return { label: "Open", tone: "info" };
    case "pending":
      return { label: "Awaiting reply", tone: "warning" };
    case "resolved":
      return { label: "Resolved", tone: "success" };
    case "closed":
      return { label: "Closed", tone: "neutral" };
  }
}

export function ledgerTypeLabel(type: LedgerEntryType) {
  switch (type) {
    case "deposit_credit":
      return "Wallet deposit";
    case "purchase_debit":
      return "Proxy purchase";
    case "refund_credit":
      return "Wallet refund";
    case "admin_credit":
      return "Admin credit";
    case "admin_debit":
      return "Admin debit";
    case "transfer_debit":
      return "Transfer out";
    case "transfer_credit":
      return "Transfer in";
    case "reversal":
      return "Reversal";
  }
}

export function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
