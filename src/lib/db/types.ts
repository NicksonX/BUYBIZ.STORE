export type UserRole = "customer" | "support" | "admin" | "super_admin";
export type AccountStatus =
  | "active"
  | "suspended"
  | "pending_verification"
  | "frozen";
export type ProxyProtocol = "http" | "https" | "socks4" | "socks5";
export type ProxyStatus = "available" | "full" | "paused" | "expired" | "disabled";
export type AllocationStatus = "active" | "expired" | "interrupted" | "revoked" | "terminated";
export type OrderStatus = "pending" | "completed" | "unfulfilled" | "refunded" | "cancelled";
export type LedgerEntryType =
  | "deposit_credit"
  | "purchase_debit"
  | "refund_credit"
  | "admin_credit"
  | "admin_debit"
  | "transfer_debit"
  | "transfer_credit"
  | "referral_credit"
  | "reversal";
export type DepositStatus =
  | "initiated"
  | "pending"
  | "successful"
  | "failed"
  | "abandoned"
  | "reversed"
  | "credited";
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory = "general" | "proxy" | "wallet" | "deposit" | "technical";
export type NotificationType =
  | "order"
  | "allocation"
  | "refund"
  | "deposit"
  | "support"
  | "system"
  | "security";

export interface Profile {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  onboardingComplete: boolean;
  proxyUseCase?: string | null;
  onboardingCompletedAt?: Date | null;
  lastActivityAt?: Date | null;
  frozenAt?: Date | null;
  freezeReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  durationSeconds: number | null;
  priceMinor: number;
  currency: string;
  isActive: boolean;
  isComingSoon: boolean;
  features: string[];
  sortOrder: number;
  accessType: "shared" | "single";
  maxActivePerCustomer: number | null;
}

export interface ProxyInventory {
  id: string;
  label: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  encryptedUsername: string | null;
  encryptedPassword: string | null;
  region: string | null;
  providerNote: string | null;
  purchaseCostMinor: number;
  currency: string;
  maxSeats: number;
  accessType: "shared" | "single";
  uploadedAt: Date;
  upstreamExpiresAt: Date;
  expiryIsEstimated: boolean;
  status: ProxyStatus;
  adminNotes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  activeSeats?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  productId: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  failureReason: string | null;
  idempotencyKey: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface OrderDetail extends Order {
  productName: string;
  productSlug: string;
  durationSeconds: number | null;
  username: string;
  email: string;
  allocationId: string | null;
  allocationStatus: AllocationStatus | null;
  allocationExpiresAt: Date | null;
}

export interface Allocation {
  id: string;
  userId: string;
  proxyInventoryId: string;
  orderId: string;
  productId: string;
  status: AllocationStatus;
  activatedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  interruptionReason: string | null;
  createdAt: Date;
}

export interface AllocationDetail extends Allocation {
  proxyLabel: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  region: string | null;
  encryptedUsername: string | null;
  encryptedPassword: string | null;
  inventoryExpiresAt: Date;
  inventoryStatus: ProxyStatus;
  maxSeats: number;
  productName: string;
  durationSeconds: number | null;
  orderNumber: string;
  orderStatus: OrderStatus;
}

export interface WalletAccount {
  id: string;
  userId: string;
  currency: string;
  balanceMinor: number;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  entryType: LedgerEntryType;
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  reference: string;
  relatedOrderId: string | null;
  relatedDepositId: string | null;
  description: string;
  createdAt: Date;
  orderNumber?: string | null;
}

export interface Deposit {
  id: string;
  userId: string;
  provider: string;
  providerReference: string;
  amountMinor: number;
  currency: string;
  status: DepositStatus;
  providerTransactionId: string | null;
  gatewayFeeMinor: number;
  authorizationUrl: string | null;
  channel: string | null;
  verifiedAt: Date | null;
  creditedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  lastMessageAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  username?: string;
  email?: string;
  messageCount?: number;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorUserId: string | null;
  isStaff: boolean;
  body: string;
  createdAt: Date;
  authorName?: string | null;
  authorRole?: UserRole | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amountMinor: number;
  currency: string;
  expenseDate: string;
  proxyInventoryId: string | null;
  notes: string | null;
  createdAt: Date;
  proxyLabel?: string | null;
}

export interface AuditLog {
  id: number;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  actorUsername?: string | null;
}

export interface AppSettings {
  inventoryDefaultMaxSeats: number;
  referralMinProxyDurationDays: number;
  allocationSafetyBufferSeconds: number;
  stockExpiryDefaultDays: number;
  depositMinMinor: number;
  depositScheduledMinMinor: number;
  depositScheduledAt: string | null;
  depositMaxMinor: number;
  maintenanceMode: boolean;
  supportEmail: string;
  inventoryExpiryRemedy: string;
  paystackChannels: string[];
  legalReviewRequired: boolean;
  inactivityDays: number;
  reactivationFeeMinor: number;
  adminNotificationEmail: string;
  adminNotificationPhone: string;
  adminVoicePhone: string;
  adminNotificationChannels: string[];
  adminReminderTime: string;
  adminTimezone: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PlanAvailability {
  product: Product;
  eligibleInventory: number;
  freeSeats: number;
  available: boolean;
}

export interface WalletTransfer {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  amountMinor: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "reversed";
  reference: string;
  note: string | null;
  createdAt: Date;
}
