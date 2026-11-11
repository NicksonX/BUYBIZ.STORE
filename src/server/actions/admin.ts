"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { Profile } from "@/lib/db/types";
import { AppError, toUserMessage } from "@/lib/errors";
import { getRequestMeta, rateLimit } from "@/lib/security/rate-limit";
import { decryptOptional, encryptOptional } from "@/lib/security/encryption";
import { parseNairaToKobo } from "@/lib/utils";
import {
  adjustmentSchema,
  expenseSchema,
  inventoryEditSchema,
  inventorySchema,
  productUpdateSchema,
  roleUpdateSchema,
  rotateCredentialsSchema,
  settingsSchema,
  suspendUserSchema,
  ticketReplySchema,
  zodFieldErrors,
} from "@/lib/validation/schemas";
import {
  formError,
  formSuccess,
  type ActionState,
} from "@/lib/validation/action-state";
import {
  requireAdmin,
  requireStaff,
  requireSuperAdmin,
} from "@/server/auth/guards";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { replyAsStaff, updateTicketStatus } from "@/server/services/support";
import { verifyAndCreditDeposit } from "@/server/services/deposits";

export type CredentialsState = ActionState & {
  credentials?: { username: string | null; password: string | null };
};

async function adminActor(): Promise<
  { ok: true; admin: Profile } | { ok: false; state: ActionState }
> {
  try {
    return { ok: true, admin: await requireAdmin() };
  } catch (error) {
    return { ok: false, state: formError(toUserMessage(error)) };
  }
}

async function staffActor(): Promise<
  { ok: true; admin: Profile } | { ok: false; state: ActionState }
> {
  try {
    return { ok: true, admin: await requireStaff() };
  } catch (error) {
    return { ok: false, state: formError(toUserMessage(error)) };
  }
}

function invalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/allocations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/deposits");
  revalidatePath("/admin/ledger");
  revalidatePath("/admin/adjustments");
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/audit");
  revalidatePath("/admin/support");
  revalidatePath("/admin/products");
  revalidatePath("/admin/settings");
}

export async function createInventoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const admin = actor.admin;

  const parsed = inventorySchema.safeParse({
    label: formData.get("label"),
    protocol: formData.get("protocol"),
    host: formData.get("host"),
    port: formData.get("port"),
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
    region: formData.get("region") ?? "",
    providerNote: formData.get("providerNote") ?? "",
    purchaseCost: formData.get("purchaseCost") ?? "",
    maxSeats: formData.get("maxSeats") ?? 10,
    accessType: formData.get("accessType") ?? "shared",
    upstreamExpiry: formData.get("upstreamExpiry"),
    expiryIsEstimated: formData.get("expiryIsEstimated") ?? "true",
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  const maxSeats = data.accessType === "single" ? 1 : data.maxSeats;
  if (Boolean(data.username) !== Boolean(data.password)) {
    return formError("Enter both the upstream username and password, or neither.", {
      username: "Username and password must be provided together.",
      password: "Username and password must be provided together.",
    });
  }
  const expiry = /^\d{4}-\d{2}-\d{2}$/.test(data.upstreamExpiry)
    ? new Date(`${data.upstreamExpiry}T23:59:59+01:00`)
    : new Date(data.upstreamExpiry);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
    return formError("Choose an upstream expiry in the future.", {
      upstreamExpiry: "Expiry must be in the future.",
    });
  }
  const costMinor = data.purchaseCost
    ? parseNairaToKobo(data.purchaseCost)
    : 0;
  if (costMinor === null) {
    return formError("Enter a valid purchase cost.", {
      purchaseCost: "Use a naira amount, for example 1500.",
    });
  }
  const meta = await getRequestMeta();
  const db = await getDb();
  let destination: string | null = null;
  try {
    const encryptedUsername = await encryptOptional(data.username);
    const encryptedPassword = await encryptOptional(data.password);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query(
        `insert into proxy_inventory
           (id, label, protocol, host, port, encrypted_username, encrypted_password,
            region, provider_note, purchase_cost_minor, currency, max_seats,
            access_type, uploaded_at, upstream_expires_at, expiry_is_estimated,
            status, admin_notes, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NGN',$11,$12,now(),$13,$14,'available',$15,$16)`,
        [
          id,
          data.label,
          data.protocol,
          data.host.trim(),
          data.port,
          encryptedUsername,
          encryptedPassword,
          data.region?.trim() || null,
          data.providerNote?.trim() || null,
          costMinor,
          maxSeats,
          data.accessType,
          expiry,
          data.expiryIsEstimated === "true",
          data.adminNotes?.trim() || null,
          admin.id,
        ],
      );
      await writeAuditLog(tx, {
        actorUserId: admin.id,
        actorRole: admin.role,
        action: "inventory.created",
        entityType: "proxy_inventory",
        entityId: id,
        metadata: {
          label: data.label,
          protocol: data.protocol,
          region: data.region || null,
          maxSeats,
          accessType: data.accessType,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    destination = `/admin/inventory/${id}`;
    invalidateAdmin();
  } catch (error) {
    console.error("[buybiz/admin] inventory create failed", error);
    return formError(toUserMessage(error, "The inventory item could not be created."));
  }
  if (destination) redirect(destination);
  return formError("The inventory item could not be created.");
}

export async function updateInventoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const parsed = inventoryEditSchema.safeParse({
    inventoryId: formData.get("inventoryId"),
    label: formData.get("label"),
    region: formData.get("region") ?? "",
    providerNote: formData.get("providerNote") ?? "",
    adminNotes: formData.get("adminNotes") ?? "",
    purchaseCost: formData.get("purchaseCost") ?? "",
    maxSeats: formData.get("maxSeats"),
    accessType: formData.get("accessType") ?? "shared",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const costMinor = parsed.data.purchaseCost
    ? parseNairaToKobo(parsed.data.purchaseCost)
    : 0;
  if (costMinor === null) {
    return formError("Enter a valid purchase cost.", {
      purchaseCost: "Use a naira amount.",
    });
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const current = await tx.query<{
        activeSeats: number;
        label: string;
      }>(
        `select i.label,
                (select count(*)::int from proxy_allocations a
                  where a.proxy_inventory_id = i.id and a.status = 'active'
                    and a.expires_at > now()) as "activeSeats"
           from proxy_inventory i where i.id = $1 for update`,
        [parsed.data.inventoryId],
      );
      const row = current.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "That inventory item was not found.");
      const nextMaxSeats =
        parsed.data.accessType === "single" ? 1 : parsed.data.maxSeats;
      if (nextMaxSeats < Number(row.activeSeats)) {
        throw new AppError(
          "CONFLICT",
          `This proxy already has ${row.activeSeats} active customers. Maximum seats cannot be lower than that.`,
        );
      }
      await tx.query(
        `update proxy_inventory
            set label = $2, region = $3, provider_note = $4,
                admin_notes = $5, purchase_cost_minor = $6, max_seats = $7,
                access_type = $8, updated_at = now()
          where id = $1`,
        [
          parsed.data.inventoryId,
          parsed.data.label,
          parsed.data.region?.trim() || null,
          parsed.data.providerNote?.trim() || null,
          parsed.data.adminNotes?.trim() || null,
          costMinor,
          nextMaxSeats,
          parsed.data.accessType,
        ],
      );
      await tx.query(`select reconcile_proxy_status()`);
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "inventory.updated",
        entityType: "proxy_inventory",
        entityId: parsed.data.inventoryId,
        metadata: {
          label: parsed.data.label,
          maxSeats: nextMaxSeats,
          accessType: parsed.data.accessType,
          costMinor,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    return formSuccess("Inventory details saved.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] inventory update failed", error);
    return formError("The inventory details could not be saved.");
  }
}

export async function setInventoryStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const inventoryId = String(formData.get("inventoryId") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  if (!inventoryId) return formError("Missing inventory ID.");
  if (!["paused", "available", "disabled", "archive"].includes(nextStatus)) {
    return formError("Unsupported inventory action.");
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const current = await tx.query<{
        status: string;
        archivedAt: Date | null;
        activeSeats: number;
        upstreamExpiresAt: Date;
        label: string;
      }>(
        `select i.status, i.archived_at as "archivedAt", i.label,
                i.upstream_expires_at as "upstreamExpiresAt",
                (select count(*)::int from proxy_allocations a
                  where a.proxy_inventory_id = i.id and a.status = 'active'
                    and a.expires_at > now()) as "activeSeats"
           from proxy_inventory i where i.id = $1 for update`,
        [inventoryId],
      );
      const item = current.rows[0];
      if (!item) throw new AppError("NOT_FOUND", "That inventory item was not found.");
      if (nextStatus === "archive") {
        if (item.activeSeats > 0) {
          throw new AppError(
            "CONFLICT",
            "You cannot archive inventory with active customers. Pause it and wait for allocations to end.",
          );
        }
        await tx.query(
          `update proxy_inventory
              set status = 'disabled', archived_at = now(), updated_at = now()
            where id = $1`,
          [inventoryId],
        );
      } else if (nextStatus === "available") {
        if (new Date(item.upstreamExpiresAt) <= new Date()) {
          throw new AppError(
            "CONFLICT",
            "This proxy has already expired. Update the expiry only if the provider confirms a later date.",
          );
        }
        await tx.query(
          `update proxy_inventory set status = 'available', updated_at = now() where id = $1`,
          [inventoryId],
        );
        await tx.query(`select reconcile_proxy_status()`);
      } else {
        await tx.query(
          `update proxy_inventory set status = $2, updated_at = now() where id = $1`,
          [inventoryId, nextStatus],
        );
      }
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: nextStatus === "archive" ? "inventory.archived" : `inventory.${nextStatus}`,
        entityType: "proxy_inventory",
        entityId: inventoryId,
        metadata: {
          label: item.label,
          previousStatus: item.status,
          activeSeats: item.activeSeats,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    revalidatePath(`/admin/inventory/${inventoryId}`);
    return formSuccess("Inventory status updated.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] inventory status failed", error);
    return formError("The inventory status could not be changed.");
  }
}

export async function revealCredentialsAction(
  _previous: CredentialsState,
  formData: FormData,
): Promise<CredentialsState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const inventoryId = String(formData.get("inventoryId") ?? "");
  if (!inventoryId) return formError("Missing inventory ID.");
  const limit = await rateLimit({
    action: "admin:reveal-credentials",
    identifier: actor.admin.id,
    limit: 20,
    windowSeconds: 60,
  });
  if (!limit.allowed) return formError("Too many credential reveals. Wait a minute.");
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    const result = await db.query<{
      encryptedUsername: string | null;
      encryptedPassword: string | null;
      label: string;
    }>(
      `select encrypted_username as "encryptedUsername",
              encrypted_password as "encryptedPassword", label
         from proxy_inventory where id = $1 limit 1`,
      [inventoryId],
    );
    const row = result.rows[0];
    if (!row) return formError("That inventory item was not found.");
    const username = await decryptOptional(row.encryptedUsername);
    const password = await decryptOptional(row.encryptedPassword);
    await writeAuditLog(db, {
      actorUserId: actor.admin.id,
      actorRole: actor.admin.role,
      action: "inventory.credentials_revealed",
      entityType: "proxy_inventory",
      entityId: inventoryId,
      metadata: { label: row.label, fields: ["username", "password"] },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return {
      status: "success",
      message: "Credentials decrypted for this session. Do not share them.",
      credentials: { username, password },
    };
  } catch (error) {
    console.error("[buybiz/admin] credential reveal failed", error);
    return formError("The credentials could not be decrypted on the server.");
  }
}

export async function rotateCredentialsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const parsed = rotateCredentialsSchema.safeParse({
    inventoryId: formData.get("inventoryId"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    const encryptedUsername = await encryptOptional(parsed.data.username);
    const encryptedPassword = await encryptOptional(parsed.data.password);
    await db.transaction(async (tx) => {
      const exists = await tx.query<{ id: string; label: string }>(
        `select id, label from proxy_inventory where id = $1 limit 1 for update`,
        [parsed.data.inventoryId],
      );
      if (!exists.rows[0]) {
        throw new AppError("NOT_FOUND", "That inventory item was not found.");
      }
      await tx.query(
        `update proxy_inventory
            set encrypted_username = $2, encrypted_password = $3, updated_at = now()
          where id = $1`,
        [parsed.data.inventoryId, encryptedUsername, encryptedPassword],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "inventory.credentials_rotated",
        entityType: "proxy_inventory",
        entityId: parsed.data.inventoryId,
        metadata: {
          label: exists.rows[0].label,
          warningAcknowledged: true,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    revalidatePath(`/admin/inventory/${parsed.data.inventoryId}`);
    return formSuccess("Upstream credentials rotated. Existing customers may need the new details.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] credential rotation failed", error);
    return formError("The credentials could not be rotated.");
  }
}

export async function updateProductAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const parsed = productUpdateSchema.safeParse({
    productId: formData.get("productId"),
    price: formData.get("price"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const priceMinor = parseNairaToKobo(parsed.data.price);
  if (priceMinor === null || priceMinor <= 0) {
    return formError("Enter a valid price in naira.", {
      price: "Use a naira amount greater than zero.",
    });
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const current = await tx.query<{
        slug: string;
        priceMinor: number;
        isActive: boolean;
        isComingSoon: boolean;
      }>(
        `select slug, price_minor as "priceMinor", is_active as "isActive",
                is_coming_soon as "isComingSoon"
           from products where id = $1 limit 1 for update`,
        [parsed.data.productId],
      );
      const product = current.rows[0];
      if (!product) throw new AppError("NOT_FOUND", "That product was not found.");
      if (product.isComingSoon) {
        throw new AppError(
          "CONFLICT",
          "Coming-soon products cannot be activated or priced from this page.",
        );
      }
      await tx.query(
        `update products set price_minor = $2, is_active = $3,
                updated_at = now()
          where id = $1`,
        [parsed.data.productId, priceMinor, parsed.data.isActive === "true"],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "product.updated",
        entityType: "product",
        entityId: parsed.data.productId,
        metadata: {
          slug: product.slug,
          oldPriceMinor: Number(product.priceMinor),
          newPriceMinor: priceMinor,
          oldActive: product.isActive,
          newActive: parsed.data.isActive === "true",
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    revalidatePath("/");
    revalidatePath("/pricing");
    revalidatePath("/marketplace");
    revalidatePath("/dashboard/marketplace");
    return formSuccess("Product settings updated.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] product update failed", error);
    return formError("The product could not be updated.");
  }
}

export async function suspendUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const parsed = suspendUserSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return formError("Provide a reason.", zodFieldErrors(parsed.error));
  }
  if (parsed.data.userId === actor.admin.id) {
    return formError("You cannot suspend your own account.");
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const target = await tx.query<{
        username: string;
        role: string;
        status: string;
      }>(
        `select username, role, status from profiles where id = $1 limit 1 for update`,
        [parsed.data.userId],
      );
      const user = target.rows[0];
      if (!user) throw new AppError("NOT_FOUND", "That user was not found.");
      if (
        (user.role === "admin" || user.role === "super_admin") &&
        actor.admin.role !== "super_admin"
      ) {
        throw new AppError(
          "FORBIDDEN",
          "Only a super admin can suspend another admin.",
        );
      }
      await tx.query(
        `update profiles set status = 'suspended', updated_at = now() where id = $1`,
        [parsed.data.userId],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "user.suspended",
        entityType: "profile",
        entityId: parsed.data.userId,
        metadata: { username: user.username, reason: parsed.data.reason },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      await notifyUser(tx, {
        userId: parsed.data.userId,
        type: "security",
        title: "Your account was suspended",
        body: `An administrator suspended your account. Reason: ${parsed.data.reason}. Contact support for help.`,
        href: "/dashboard/support",
      });
    });
    invalidateAdmin();
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return formSuccess("User suspended.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] suspend failed", error);
    return formError("The user could not be suspended.");
  }
}

export async function reactivateUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId) return formError("Missing user ID.");
  if (reason.length < 5) return formError("Add a short reason for reactivation.");
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const target = await tx.query<{ username: string }>(
        `select username from profiles where id = $1 limit 1 for update`,
        [userId],
      );
      if (!target.rows[0]) throw new AppError("NOT_FOUND", "That user was not found.");
      await tx.query(
        `update profiles set status = 'active', updated_at = now() where id = $1`,
        [userId],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "user.reactivated",
        entityType: "profile",
        entityId: userId,
        metadata: { username: target.rows[0].username, reason },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      await notifyUser(tx, {
        userId,
        type: "security",
        title: "Your account is active again",
        body: "An administrator reactivated your BUYBIZ account. You can buy and deposit again.",
        href: "/dashboard",
      });
    });
    invalidateAdmin();
    revalidatePath(`/admin/users/${userId}`);
    return formSuccess("User reactivated.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] reactivate failed", error);
    return formError("The user could not be reactivated.");
  }
}

export async function changeRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let superAdmin: Profile;
  try {
    superAdmin = await requireSuperAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const parsed = roleUpdateSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  if (parsed.data.userId === superAdmin.id) {
    return formError("You cannot change your own role.");
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const target = await tx.query<{ username: string; role: string }>(
        `select username, role from profiles where id = $1 limit 1 for update`,
        [parsed.data.userId],
      );
      const user = target.rows[0];
      if (!user) throw new AppError("NOT_FOUND", "That user was not found.");
      if (user.role === "super_admin" && parsed.data.role !== "super_admin") {
        const count = await tx.query<{ count: number }>(
          `select count(*)::int as count from profiles where role = 'super_admin'`,
        );
        if ((count.rows[0]?.count ?? 0) <= 1) {
          throw new AppError("CONFLICT", "You cannot remove the last super admin.");
        }
      }
      await tx.query(
        `update profiles set role = $2, updated_at = now() where id = $1`,
        [parsed.data.userId, parsed.data.role],
      );
      await writeAuditLog(tx, {
        actorUserId: superAdmin.id,
        actorRole: superAdmin.role,
        action: "user.role_changed",
        entityType: "profile",
        entityId: parsed.data.userId,
        metadata: { username: user.username, oldRole: user.role, newRole: parsed.data.role },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return formSuccess("Role updated.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] role change failed", error);
    return formError("The role could not be changed.");
  }
}

export async function adjustWalletAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const limit = await rateLimit({
    action: "admin:wallet-adjust",
    identifier: actor.admin.id,
    limit: 10,
    windowSeconds: 60,
  });
  if (!limit.allowed) return formError("Too many wallet adjustments. Wait a minute.");
  const parsed = adjustmentSchema.safeParse({
    userId: formData.get("userId"),
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const amountMinor = parseNairaToKobo(parsed.data.amount);
  if (amountMinor === null || amountMinor <= 0) {
    return formError("Enter a valid amount greater than zero.", {
      amount: "Enter a valid naira amount.",
    });
  }
  const adjustmentKey = String(formData.get("adjustmentKey") ?? randomUUID());
  const signed = parsed.data.direction === "credit" ? amountMinor : -amountMinor;
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const target = await tx.query<{ username: string; status: string }>(
        `select username, status from profiles where id = $1 limit 1 for update`,
        [parsed.data.userId],
      );
      const user = target.rows[0];
      if (!user) throw new AppError("NOT_FOUND", "That user was not found.");
      await tx.query(
        `insert into wallet_accounts (user_id) values ($1)
         on conflict (user_id) do nothing`,
        [parsed.data.userId],
      );
      const wallet = await tx.query<{ id: string }>(
        `select id from wallet_accounts where user_id = $1 for update`,
        [parsed.data.userId],
      );
      if (!wallet.rows[0]) throw new AppError("UNKNOWN", "Wallet not found.");
      const balanceRes = await tx.query<{ balance: number }>(
        `select coalesce(sum(amount_minor),0)::bigint as balance
           from wallet_ledger where wallet_account_id = $1`,
        [wallet.rows[0].id],
      );
      const balance = Number(balanceRes.rows[0]?.balance ?? 0);
      const newBalance = balance + signed;
      if (newBalance < 0) {
        throw new AppError(
          "CONFLICT",
          `This debit would make the balance negative. Available: ₦${(balance / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}.`,
        );
      }
      await tx.query(
        `insert into wallet_ledger
           (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
            currency, reference, description, created_by)
         values ($1,$2,$3,$4,$5,'NGN',$6,$7,$8)`,
        [
          wallet.rows[0].id,
          parsed.data.userId,
          parsed.data.direction === "credit" ? "admin_credit" : "admin_debit",
          signed,
          newBalance,
          `admin-adjust:${adjustmentKey}`,
          `Admin adjustment: ${parsed.data.reason}`,
          actor.admin.id,
        ],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action:
          parsed.data.direction === "credit"
            ? "wallet.admin_credit"
            : "wallet.admin_debit",
        entityType: "wallet",
        entityId: parsed.data.userId,
        metadata: {
          username: user.username,
          amountMinor,
          reason: parsed.data.reason,
          adjustmentKey,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      await notifyUser(tx, {
        userId: parsed.data.userId,
        type: "system",
        title: parsed.data.direction === "credit" ? "Wallet credit added" : "Wallet debit recorded",
        body: `An administrator ${parsed.data.direction === "credit" ? "credited" : "debited"} your BUYBIZ wallet. Reason: ${parsed.data.reason}.`,
        href: "/dashboard/transactions",
      });
    });
    invalidateAdmin();
    return formSuccess(
      parsed.data.direction === "credit"
        ? "Wallet credit recorded."
        : "Wallet debit recorded.",
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return formError("This adjustment was already processed.");
    }
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] wallet adjustment failed", error);
    return formError("The wallet adjustment could not be completed.");
  }
}

export async function createExpenseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const amountMinor = parseNairaToKobo(parsed.data.amount);
  if (amountMinor === null || amountMinor <= 0) {
    return formError("Enter a valid expense amount.", {
      amount: "Enter a naira amount greater than zero.",
    });
  }
  const date = new Date(`${parsed.data.expenseDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000) {
    return formError("Choose a valid expense date that is not in the future.", {
      expenseDate: "Choose a past or present date.",
    });
  }
  const proxyInventoryId = String(formData.get("proxyInventoryId") ?? "");
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const id = randomUUID();
      await tx.query(
        `insert into expenses
           (id, description, category, amount_minor, currency, expense_date,
            proxy_inventory_id, notes, created_by)
         values ($1,$2,$3,$4,'NGN',$5,$6,$7,$8)`,
        [
          id,
          parsed.data.description,
          parsed.data.category,
          amountMinor,
          parsed.data.expenseDate,
          proxyInventoryId || null,
          parsed.data.notes?.trim() || null,
          actor.admin.id,
        ],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "expense.created",
        entityType: "expense",
        entityId: id,
        metadata: {
          description: parsed.data.description,
          category: parsed.data.category,
          amountMinor,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    return formSuccess("Expense recorded.");
  } catch (error) {
    console.error("[buybiz/admin] expense create failed", error);
    return formError("The expense could not be recorded.");
  }
}

export async function verifyDepositAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const depositId = String(formData.get("depositId") ?? "");
  const reference = String(formData.get("reference") ?? "");
  if (!depositId || !reference) return formError("Missing deposit details.");
  try {
    const result = await verifyAndCreditDeposit({
      reference,
      actorUserId: actor.admin.id,
    });
    const meta = await getRequestMeta();
    await writeAuditLog(await getDb(), {
      actorUserId: actor.admin.id,
      actorRole: actor.admin.role,
      action: "deposit.admin_verified",
      entityType: "deposit",
      entityId: depositId,
      metadata: { reference, status: result.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    invalidateAdmin();
    return result.status === "credited"
      ? formSuccess(result.message)
      : formError(result.message);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] deposit verify failed", error);
    return formError("The deposit could not be verified.");
  }
}

export async function adminTicketReplyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await staffActor();
  if (!actor.ok) return actor.state;
  const parsed = ticketReplySchema.safeParse({
    ticketId: formData.get("ticketId"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return formError("Write a reply.", zodFieldErrors(parsed.error));
  }
  try {
    await replyAsStaff({
      staffId: actor.admin.id,
      staffRole: actor.admin.role,
      ticketId: parsed.data.ticketId,
      message: parsed.data.message,
    });
    invalidateAdmin();
    revalidatePath(`/admin/support/${parsed.data.ticketId}`);
    revalidatePath(`/dashboard/support/${parsed.data.ticketId}`);
    return formSuccess("Reply sent to the customer.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] ticket reply failed", error);
    return formError("The reply could not be sent.");
  }
}

export async function setTicketStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await staffActor();
  if (!actor.ok) return actor.state;
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["open", "pending", "resolved", "closed"].includes(status)) {
    return formError("Unsupported ticket status.");
  }
  try {
    await updateTicketStatus({
      staffId: actor.admin.id,
      ticketId,
      status: status as "open" | "pending" | "resolved" | "closed",
    });
    const db = await getDb();
    const meta = await getRequestMeta();
    await writeAuditLog(db, {
      actorUserId: actor.admin.id,
      actorRole: actor.admin.role,
      action: "support.status_changed",
      entityType: "support_ticket",
      entityId: ticketId,
      metadata: { status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    invalidateAdmin();
    return formSuccess("Ticket status updated.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] ticket status failed", error);
    return formError("The ticket status could not be updated.");
  }
}

export async function updateContactMessageStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await staffActor();
  if (!actor.ok) return actor.state;
  const id = String(formData.get("messageId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["new", "read", "archived"].includes(status)) {
    return formError("Unsupported message status.");
  }
  const db = await getDb();
  await db.query(`update contact_messages set status = $2 where id = $1`, [
    id,
    status,
  ]);
  invalidateAdmin();
  return formSuccess("Message status updated.");
}

export async function updateSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let admin: Profile;
  try {
    admin = await requireSuperAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const parsed = settingsSchema.safeParse({
    inventoryDefaultMaxSeats: formData.get("inventoryDefaultMaxSeats"),
    allocationSafetyBufferMinutes: formData.get("allocationSafetyBufferMinutes"),
    stockExpiryDefaultDays: formData.get("stockExpiryDefaultDays"),
    depositMin: formData.get("depositMin"),
    depositMax: formData.get("depositMax"),
    maintenanceMode: formData.get("maintenanceMode"),
    supportEmail: formData.get("supportEmail") ?? "",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const minMinor = parseNairaToKobo(parsed.data.depositMin);
  const maxMinor = parseNairaToKobo(parsed.data.depositMax);
  if (minMinor === null || maxMinor === null || minMinor <= 0 || maxMinor < minMinor) {
    return formError("Check the deposit limits.", {
      depositMin: "Enter a valid minimum.",
      depositMax: "Maximum must be greater than the minimum.",
    });
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  const updates: Array<[string, unknown]> = [
    ["inventory_default_max_seats", parsed.data.inventoryDefaultMaxSeats],
    [
      "allocation_safety_buffer_seconds",
      parsed.data.allocationSafetyBufferMinutes * 60,
    ],
    ["stock_expiry_default_days", parsed.data.stockExpiryDefaultDays],
    ["deposit_min_minor", minMinor],
    ["deposit_max_minor", maxMinor],
    ["maintenance_mode", parsed.data.maintenanceMode === "true"],
    ["support_email", parsed.data.supportEmail?.trim() || ""],
  ];
  try {
    await db.transaction(async (tx) => {
      for (const [key, value] of updates) {
        await tx.query(
          `insert into app_settings (key, value, updated_by, updated_at)
           values ($1,$2::jsonb,$3,now())
           on conflict (key) do update
             set value = excluded.value, updated_by = excluded.updated_by,
                 updated_at = now()`,
          [key, JSON.stringify(value), admin.id],
        );
      }
      await writeAuditLog(tx, {
        actorUserId: admin.id,
        actorRole: admin.role,
        action: "settings.updated",
        entityType: "app_settings",
        entityId: null,
        metadata: {
          keys: updates.map(([key]) => key),
          maintenanceMode: parsed.data.maintenanceMode === "true",
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    revalidatePath("/");
    revalidatePath("/pricing");
    revalidatePath("/dashboard");
    return formSuccess("Settings saved.");
  } catch (error) {
    console.error("[buybiz/admin] settings update failed", error);
    return formError("The settings could not be saved.");
  }
}

export async function runLifecycleAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  let admin: Profile;
  try {
    admin = await requireSuperAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    const result = await db.query<{ result: unknown }>(
      `select run_lifecycle_jobs() as result`,
    );
    await writeAuditLog(db, {
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "lifecycle.manual_run",
      entityType: "system",
      entityId: null,
      metadata: { result: result.rows[0]?.result ?? {} },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    invalidateAdmin();
    return formSuccess("Expiry and inventory reconciliation completed.");
  } catch (error) {
    console.error("[buybiz/admin] lifecycle failed", error);
    return formError("The lifecycle job failed. Check server logs.");
  }
}
