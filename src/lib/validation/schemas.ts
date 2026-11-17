import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be 24 characters or fewer.")
  .regex(
    /^[A-Za-z0-9_]+$/,
    "Use only letters, numbers and underscores. No spaces.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    acceptTerms: z.literal("on", {
      message: "Accept the draft terms and privacy notice to continue.",
    }),
    referralCode: z
      .string()
      .trim()
      .max(24)
      .optional()
      .or(z.literal("")),
  })
  .strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  useCase: z.enum([
    "social_media",
    "scraping",
    "business",
    "automation",
    "research",
    "other",
  ]),
  username: usernameSchema.optional(),
  next: z.string().optional(),
});

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .max(60, "Display name must be 60 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const purchaseSchema = z.object({
  productSlug: z.string().min(1),
  idempotencyKey: z.string().min(8).max(120),
  confirm: z.literal("on", {
    message: "Please confirm the wallet debit before purchasing.",
  }),
});

export const depositSchema = z.object({
  amount: z.string().min(1, "Enter an amount."),
});

export const terminateProxySchema = z.object({
  allocationId: z.string().uuid("Invalid proxy."),
  confirm: z.literal("on", { message: "Confirm the termination." }),
});

export const switchProxySchema = z.object({
  allocationId: z.string().uuid("Invalid proxy."),
  inventoryId: z.string().uuid("Choose an available proxy."),
  confirm: z.literal("on", { message: "Confirm the switch." }),
});

export const ticketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters.")
    .max(120, "Subject must be 120 characters or fewer."),
  category: z.enum(["general", "proxy", "wallet", "deposit", "technical"]),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  message: z
    .string()
    .trim()
    .min(10, "Describe the issue in at least 10 characters.")
    .max(5000, "Message is too long."),
});

export const ticketReplySchema = z.object({
  ticketId: z.string().uuid(),
  message: z
    .string()
    .trim()
    .min(1, "Write a message.")
    .max(5000, "Message is too long."),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  subject: z.string().trim().min(3, "Enter a subject.").max(140),
  message: z
    .string()
    .trim()
    .min(20, "Tell us a little more (at least 20 characters).")
    .max(4000, "Message is too long."),
});

export const adjustmentSchema = z.object({
  userId: z.string().uuid("Select a customer."),
  direction: z.enum(["credit", "debit"]),
  amount: z.string().min(1, "Enter an amount."),
  reason: z
    .string()
    .trim()
    .min(8, "Provide a clear reason (at least 8 characters).")
    .max(500, "Reason is too long."),
  confirm: z.literal("on", { message: "Confirm this financial action." }),
});

export const expenseSchema = z.object({
  description: z.string().trim().min(3, "Enter a description.").max(160),
  category: z.string().trim().min(2).max(40),
  amount: z.string().min(1, "Enter an amount."),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const productUpdateSchema = z.object({
  productId: z.string().uuid(),
  price: z.string().min(1, "Enter a price."),
  isActive: z.enum(["true", "false"]),
});

export const inventorySchema = z.object({
  countryCode: z.string().length(2).regex(/^[A-Za-z]{2}$/),
  verificationStatus: z.enum(["unverified", "verified", "failed", "review_required"]).default("unverified"),
  label: z.string().trim().min(2, "Enter a label.").max(80),
  protocol: z.enum(["http", "https", "socks4", "socks5"]),
  host: z.string().trim().min(3, "Enter a host.").max(255),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim().max(200).optional().or(z.literal("")),
  password: z.string().max(500).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  providerNote: z.string().trim().max(500).optional().or(z.literal("")),
  purchaseCost: z.string().optional().or(z.literal("")),
  maxSeats: z.coerce.number().int().min(1).max(10).default(10),
  accessType: z.enum(["shared", "single"]).default("shared"),
  productSlug: z.string().trim().min(1, "Choose the package this proxy serves.").max(80),
  credentialGroup: z.string().trim().min(1).max(24).default("A"),
  rotationIntervalHours: z.coerce.number().int().min(0).max(8760).optional(),
  upstreamExpiry: z.string().min(1, "Set an upstream expiry date."),
  expiryIsEstimated: z.enum(["true", "false"]).default("true"),
  adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const renewalSchema = z.object({
  allocationId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(80),
  confirm: z.literal("on", { message: "Confirm the renewal debit." }),
});

export const suspendUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(5, "Provide a reason.").max(500),
});

export const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["customer", "support", "admin", "super_admin"]),
  confirm: z.literal("on", { message: "Confirm the role change." }),
});

export const settingsSchema = z.object({
  inventoryDefaultMaxSeats: z.coerce.number().int().min(1).max(15),
  referralMinProxyDurationDays: z.coerce.number().int().min(1).max(365),
  allocationSafetyBufferMinutes: z.coerce.number().int().min(0).max(10080),
  stockExpiryDefaultDays: z.coerce.number().int().min(1).max(365),
  depositMin: z.string().min(1),
  depositMax: z.string().min(1),
  maintenanceMode: z.enum(["true", "false"]),
  supportEmail: z.string().trim().max(200).optional().or(z.literal("")),
  inactivityDays: z.coerce.number().int().min(1).max(3650),
  reactivationFee: z.string().min(1),
  adminNotificationEmail: z.string().trim().max(200).optional().or(z.literal("")),
  adminNotificationPhone: z.string().trim().max(40).optional().or(z.literal("")),
  adminVoicePhone: z.string().trim().max(40).optional().or(z.literal("")),
  adminReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM."),
  adminTimezone: z.string().trim().min(3).max(80),
  adminNotificationChannels: z
    .array(z.enum(["in_app", "email", "sms", "voice"]))
    .default(["in_app"]),
});

export const inventoryEditSchema = z.object({
  inventoryId: z.string().uuid(),
  label: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  providerNote: z.string().trim().max(500).optional().or(z.literal("")),
  adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  purchaseCost: z.string().optional().or(z.literal("")),
  maxSeats: z.coerce.number().int().min(1).max(10),
  accessType: z.enum(["shared", "single"]).default("shared"),
  productSlug: z.string().trim().min(1).max(80),
  credentialGroup: z.string().trim().min(1).max(24),
  rotationIntervalHours: z.coerce.number().int().min(0).max(8760).optional(),
});

export const rotateCredentialsSchema = z.object({
  inventoryId: z.string().uuid(),
  username: z.string().trim().min(1, "Enter the upstream username.").max(200),
  password: z.string().min(1, "Enter the upstream password.").max(500),
  host: z.string().trim().max(255).optional().or(z.literal("")),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  confirm: z.literal("on", {
    message: "Confirm that shared customers may be affected.",
  }),
});

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
