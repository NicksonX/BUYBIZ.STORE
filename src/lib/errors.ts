export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "INSUFFICIENT_BALANCE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_UPSTREAM_LIFETIME"
  | "PROXY_AT_CAPACITY"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_SUSPENDED"
  | "MAINTENANCE"
  | "RATE_LIMITED"
  | "CONFIGURATION"
  | "PAYMENT_FAILED"
  | "CONFLICT"
  | "NOT_FOUND"
  | "UNKNOWN";

export class AppError extends Error {
  code: AppErrorCode;
  userMessage: string;
  details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    userMessage: string,
    details?: Record<string, unknown>,
  ) {
    super(userMessage);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof AppError) return error.userMessage;
  if (error instanceof Error) {
    if (error.message.includes("PROXY_AT_CAPACITY")) {
      return "The selected proxy just filled up. Please try again.";
    }
    if (error.message.includes("INSUFFICIENT_UPSTREAM_LIFETIME")) {
      return "There is not enough remaining proxy inventory life for this package.";
    }
    if (error.message.includes("PROXY_INVENTORY_EXPIRED")) {
      return "The selected proxy inventory has expired.";
    }
  }
  return fallback;
}
