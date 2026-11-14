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
import { queueEmail, flushEmailQueue } from "@/server/services/email";

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
  revalidatePath("/admin/inactivity");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/rotation");
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
    productSlug: formData.get("productSlug"),
    credentialGroup: formData.get("credentialGroup") ?? "A",
    rotationIntervalHours: formData.get("rotationIntervalHours") ?? 0,
    upstreamExpiry: formData.get("upstreamExpiry"),
    expiryIsEstimated: formData.get("expiryIsEstimated") ?? "true",
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  const maxSeats = data.accessType === "single" ? 1 : data.maxSeats;
  const rotationHours =
    data.productSlug === "proxy-24-hours"
      ? 24
      : data.productSlug === "proxy-7-days"
        ? 168
        : null;
  if (rotationHours && data.rotationIntervalHours && data.rotationIntervalHours !== rotationHours) {
    return formError("The rotation interval is fixed by the package: 24 hours for daily, 168 hours for weekly.", {
      rotationIntervalHours: "Use the package rotation interval.",
    });
  }
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
            access_type, product_slug, credential_group, rotation_interval_hours,
            next_rotation_at, uploaded_at, upstream_expires_at, expiry_is_estimated,
            status, admin_notes, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NGN',$11,$12,$13,$14,$15,
                 case when $15::int is not null then now() + make_interval(hours => $15::int) else null end,
                 now(),$16,$17,'available',$18,$19)`,
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
          data.productSlug,
          data.credentialGroup,
          rotationHours,
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
    productSlug: formData.get("productSlug"),
    credentialGroup: formData.get("credentialGroup") ?? "A",
    rotationIntervalHours: formData.get("rotationIntervalHours") ?? 0,
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
        productSlug: string | null;
      }>(
        `select i.label, i.product_slug as "productSlug",
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
      if (row.activeSeats > 0 && row.productSlug !== parsed.data.productSlug) {
        throw new AppError(
          "CONFLICT",
          "The package cannot be changed while customers are active on this proxy. Create a new inventory group for the new package.",
        );
      }
      const rotationHours =
        parsed.data.productSlug === "proxy-24-hours"
          ? 24
          : parsed.data.productSlug === "proxy-7-days"
            ? 168
            : null;
      await tx.query(
        `update proxy_inventory
            set label = $2, region = $3, provider_note = $4,
                admin_notes = $5, purchase_cost_minor = $6, max_seats = $7,
                access_type = $8, product_slug = $9, credential_group = $10,
                rotation_interval_hours = $11,
                next_rotation_at = case when $11::int is null then null
                  else coalesce(next_rotation_at, now() + make_interval(hours => $11::int)) end,
                updated_at = now()
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
          parsed.data.productSlug,
          parsed.data.credentialGroup,
          rotationHours,
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
    host: formData.get("host") ?? "",
    port: formData.get("port") || undefined,
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
    let active = 0;
    let expired = 0;
    await db.transaction(async (tx) => {
      const current = await tx.query<{
        label: string;
        host: string;
        port: number;
        interval: number | null;
        version: number;
        active: number;
        expired: number;
      }>(
        `select i.label, i.host, i.port, i.rotation_interval_hours as interval,
                i.credential_version as version,
                (select count(*)::int from proxy_allocations a
                  where a.proxy_inventory_id=i.id and a.status='active' and a.expires_at>now()) as active,
                (select count(*)::int from proxy_allocations a
                  where a.proxy_inventory_id=i.id and a.status='active' and a.expires_at<=now()) as expired
           from proxy_inventory i where i.id=$1 for update`,
        [parsed.data.inventoryId],
      );
      const item = current.rows[0];
      if (!item) throw new AppError("NOT_FOUND", "That inventory item was not found.");
      active = Number(item.active);
      expired = Number(item.expired);
      if (active > 0) {
        await tx.query(
          `insert into admin_notifications
             (type, severity, title, body, action_url, related_inventory_id, dedupe_key)
           values ('rotation_completed_with_active', 'warning',
                   'Credentials rotated while customers are active',
                   $2 || ' was rotated with ' || $3::text || ' active customers. New credentials are available in BUYBIZ; the upstream provider may have invalidated the old login.',
                   '/admin/inventory/' || $1::text, $1,
                   'rotation_active:' || $1::text || ':' || extract(epoch from now())::text)
           on conflict (dedupe_key) do nothing`,
          [parsed.data.inventoryId, item.label, active],
        );
      }
      await tx.query(
        `update proxy_inventory
            set encrypted_username=$2, encrypted_password=$3,
                host=coalesce($4, host), port=coalesce($5, port),
                credential_version=credential_version+1,
                last_rotated_at=now(),
                next_rotation_at=case when rotation_interval_hours is null then null
                  else now() + make_interval(hours => rotation_interval_hours) end,
                updated_at=now()
          where id=$1`,
        [
          parsed.data.inventoryId,
          encryptedUsername,
          encryptedPassword,
          parsed.data.host?.trim() || null,
          parsed.data.port ?? null,
        ],
      );
      await tx.query(
        `insert into proxy_rotations
           (inventory_id, rotated_by, rotated_at, previous_version, new_version,
            affected_active, affected_expired, affected_unexpired, status, notes)
         values ($1,$2,now(),$3,$4,$5,$6,$5,'completed',$7)`,
        [
          parsed.data.inventoryId,
          actor.admin.id,
          item.version,
          item.version + 1,
          active,
          expired,
          "Manual rotation confirmed by administrator.",
        ],
      );
      await tx.query(
        `update admin_notifications
            set resolved_at=now()
          where related_inventory_id=$1
            and type in ('rotation_due_24h','rotation_due_7d','rotation_completed_with_active')
            and resolved_at is null`,
        [parsed.data.inventoryId],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "inventory.credentials_rotated",
        entityType: "proxy_inventory",
        entityId: parsed.data.inventoryId,
        metadata: {
          label: item.label,
          previousVersion: item.version,
          newVersion: item.version + 1,
          affectedActive: active,
          affectedExpired: expired,
          hostChanged: Boolean(parsed.data.host?.trim()),
          portChanged: Boolean(parsed.data.port),
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    invalidateAdmin();
    revalidatePath(`/admin/inventory/${parsed.data.inventoryId}`);
    revalidatePath("/admin/rotation");
    return formSuccess(
      active > 0
        ? `Credentials updated. ${active} active customer${active === 1 ? "" : "s"} will receive the new details immediately. The upstream provider may have invalidated the previous login.`
        : "Credentials updated and rotation recorded. No active customers were affected.",
    );
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
      const target = await tx.query<{ username: string; status: string }>(
        `select username, status from profiles where id = $1 limit 1 for update`,
        [userId],
      );
      if (!target.rows[0]) throw new AppError("NOT_FOUND", "That user was not found.");
      if (target.rows[0].status === "frozen") {
        const freeze = await tx.query<{ id: string }>(
          `select f.id
             from account_freezes f
             left join account_reactivations r on r.freeze_id=f.id
            where f.user_id=$1 and r.id is null
            order by f.frozen_at desc limit 1 for update of f`,
          [userId],
        );
        if (!freeze.rows[0]) {
          throw new AppError("CONFLICT", "No open freeze record was found.");
        }
        await tx.query(
          `insert into account_reactivations
             (freeze_id, user_id, method, fee_minor, reactivated_by, notes, reactivated_at)
           values ($1,$2,'admin',0,$3,$4,now())`,
          [freeze.rows[0].id, userId, actor.admin.id, reason],
        );
      }
      await tx.query(
        `update profiles
            set status = 'active', frozen_at = null, freeze_reason = null,
                last_activity_at = now(), last_reactivated_at = now(),
                updated_at = now()
          where id = $1`,
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
    referralMinProxyDurationDays: formData.get("referralMinProxyDurationDays"),
    allocationSafetyBufferMinutes: formData.get("allocationSafetyBufferMinutes"),
    stockExpiryDefaultDays: formData.get("stockExpiryDefaultDays"),
    depositMin: formData.get("depositMin"),
    depositMax: formData.get("depositMax"),
    maintenanceMode: formData.get("maintenanceMode"),
    supportEmail: formData.get("supportEmail") ?? "",
    inactivityDays: formData.get("inactivityDays") ?? 60,
    reactivationFee: formData.get("reactivationFee") ?? "1000",
    adminNotificationEmail: formData.get("adminNotificationEmail") ?? "",
    adminNotificationPhone: formData.get("adminNotificationPhone") ?? "",
    adminVoicePhone: formData.get("adminVoicePhone") ?? "",
    adminReminderTime: formData.get("adminReminderTime") ?? "08:00",
    adminTimezone: formData.get("adminTimezone") ?? "Africa/Lagos",
    adminNotificationChannels: formData.getAll("adminNotificationChannels"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const minMinor = parseNairaToKobo(parsed.data.depositMin);
  const maxMinor = parseNairaToKobo(parsed.data.depositMax);
  const reactivationFeeMinor = parseNairaToKobo(parsed.data.reactivationFee);
  if (
    minMinor === null ||
    maxMinor === null ||
    minMinor < 150_000 ||
    maxMinor < minMinor
  ) {
    return formError("Check the deposit limits.", {
      depositMin: "The minimum deposit is ₦1,500 and cannot be lowered.",
      depositMax: "Maximum must be greater than the minimum.",
    });
  }
  if (reactivationFeeMinor === null || reactivationFeeMinor < 0) {
    return formError("Enter a valid reactivation fee.", {
      reactivationFee: "Use a naira amount, for example 1000.",
    });
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  const updates: Array<[string, unknown]> = [
    ["inventory_default_max_seats", parsed.data.inventoryDefaultMaxSeats],
    [
      "referral_qualifying_proxy_duration_seconds",
      parsed.data.referralMinProxyDurationDays * 86_400,
    ],
    [
      "allocation_safety_buffer_seconds",
      parsed.data.allocationSafetyBufferMinutes * 60,
    ],
    ["stock_expiry_default_days", parsed.data.stockExpiryDefaultDays],
    ["deposit_min_minor", minMinor],
    ["deposit_max_minor", maxMinor],
    ["maintenance_mode", parsed.data.maintenanceMode === "true"],
    ["support_email", parsed.data.supportEmail?.trim() || ""],
    ["inactivity_days", parsed.data.inactivityDays],
    ["reactivation_fee_minor", reactivationFeeMinor],
    ["admin_notification_email", parsed.data.adminNotificationEmail?.trim() || ""],
    ["admin_notification_phone", parsed.data.adminNotificationPhone?.trim() || ""],
    ["admin_voice_phone", parsed.data.adminVoicePhone?.trim() || ""],
    [
      "admin_notification_channels",
      parsed.data.adminNotificationChannels.length
        ? parsed.data.adminNotificationChannels
        : ["in_app"],
    ],
    ["admin_reminder_time", parsed.data.adminReminderTime],
    ["admin_timezone", parsed.data.adminTimezone],
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
    revalidatePath("/dashboard/referrals");
    revalidatePath("/campaigns/[slug]", "page");
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


export async function markAdminNotificationReadAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireStaff();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const id = String(formData.get("notificationId") ?? "");
  if (!id) return formError("Missing notification.");
  const db = await getDb();
  await db.query(
    `update admin_notifications set read_at=coalesce(read_at,now()) where id=$1`,
    [id],
  );
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return formSuccess("Notification marked as read.");
}

export async function markAllAdminNotificationsReadAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await requireStaff();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const db = await getDb();
  await db.query(
    `update admin_notifications set read_at=coalesce(read_at,now())
      where read_at is null`,
  );
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return formSuccess("All administrator notifications are marked as read.");
}

export async function runAdminJobsAction(
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
    const [inactivity, reminders] = await Promise.all([
      db.query<{ result: unknown }>(`select public.run_inactivity_jobs() as result`),
      db.query<{ result: unknown }>(`select public.run_admin_reminder_jobs() as result`),
    ]);
    await writeAuditLog(db, {
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin_jobs.manual_run",
      entityType: "system",
      entityId: null,
      metadata: {
        inactivity: inactivity.rows[0]?.result ?? {},
        reminders: reminders.rows[0]?.result ?? {},
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    invalidateAdmin();
    return formSuccess("Inactivity and administrator reminder jobs completed.");
  } catch (error) {
    console.error("[buybiz/admin] admin jobs failed", error);
    return formError("The scheduled admin jobs failed. Check server logs.");
  }
}

async function ambassadorPayoutContext(id: string) {
  const db = await getDb();
  return db.query<{
    id: string;
    userId: string;
    amountCents: number;
    status: string;
    address: string;
    email: string;
    username: string;
    displayName: string | null;
  }>(
    `select w.id, w.user_id as "userId", w.amount_usd_cents as "amountCents",
            w.status, w.wallet_address as address, p.email, p.username,
            p.display_name as "displayName"
       from ambassador_withdrawals w join profiles p on p.id=w.user_id
      where w.id=$1 limit 1`,
    [id],
  );
}

function usdLabel(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function approveAmbassadorPayoutAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const id = String(formData.get("payoutId") ?? "");
  if (!id) return formError("Missing payout.");
  const db = await getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const current = await tx.query<{
        userId: string;
        amountCents: number;
        status: string;
      }>(
        `select user_id as "userId", amount_usd_cents as "amountCents", status
           from ambassador_withdrawals where id=$1 limit 1 for update`,
        [id],
      );
      const payout = current.rows[0];
      if (!payout) throw new AppError("NOT_FOUND", "Payout not found.");
      if (payout.status !== "pending") {
        throw new AppError("CONFLICT", "Only a pending payout can be approved.");
      }
      await tx.query(
        `update ambassador_withdrawals
            set status='processing', approved_at=now(), processed_by=$2, updated_at=now()
          where id=$1`,
        [id, actor.admin.id],
      );
      const person = await tx.query<{ email: string; name: string }>(
        `select email, coalesce(display_name,username) as name from profiles where id=$1`,
        [payout.userId],
      );
      if (person.rows[0]) {
        await queueEmail(tx, {
          type: "payout_approved",
          userId: payout.userId,
          recipient: person.rows[0].email,
          data: {
            name: person.rows[0].name,
            amountLabel: usdLabel(payout.amountCents),
          },
          dedupeKey: `payout_approved:${id}`,
        });
      }
      await notifyUser(tx, {
        userId: payout.userId,
        type: "system",
        title: "Payout approved",
        body: `Your ${usdLabel(payout.amountCents)} USDT payout is approved and being processed. It can take up to 3 days.`,
        href: "/dashboard/referrals",
      });
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "ambassador.payout_approved",
        entityType: "ambassador_withdrawal",
        entityId: id,
        metadata: { amountCents: payout.amountCents },
      });
      return payout;
    });
    revalidatePath("/admin/ambassador-payouts");
    revalidatePath("/dashboard/referrals");
    await flushEmailQueue(5);
    return formSuccess(`Payout ${usdLabel(result.amountCents)} approved for processing.`);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] approve payout failed", error);
    return formError("The payout could not be approved.");
  }
}

export async function rejectAmbassadorPayoutAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const id = String(formData.get("payoutId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return formError("Missing payout.");
  if (reason.length < 5) return formError("Add a short reason for the rejection.");
  const db = await getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const current = await tx.query<{
        userId: string;
        amountCents: number;
        status: string;
        address: string;
      }>(
        `select user_id as "userId", amount_usd_cents as "amountCents",
                status, wallet_address as address
           from ambassador_withdrawals where id=$1 limit 1 for update`,
        [id],
      );
      const payout = current.rows[0];
      if (!payout) throw new AppError("NOT_FOUND", "Payout not found.");
      if (!["pending", "processing"].includes(payout.status)) {
        throw new AppError("CONFLICT", "This payout can no longer be rejected.");
      }
      await tx.query(
        `update ambassador_withdrawals
            set status='rejected', rejected_at=now(), rejection_reason=$2,
                processed_by=$3, updated_at=now()
          where id=$1`,
        [id, reason, actor.admin.id],
      );
      await tx.query(
        `insert into ambassador_ledger
           (user_id, entry_type, amount_usd_cents, reference, withdrawal_id, description)
         values ($1,'withdrawal_release',$2,$3,$4,$5)
         on conflict (reference) do nothing`,
        [
          payout.userId,
          payout.amountCents,
          `withdrawal:release:${id}`,
          id,
          "Rejected ambassador payout released",
        ],
      );
      const person = await tx.query<{ email: string; name: string }>(
        `select email, coalesce(display_name,username) as name from profiles where id=$1`,
        [payout.userId],
      );
      if (person.rows[0]) {
        await queueEmail(tx, {
          type: "payout_rejected",
          userId: payout.userId,
          recipient: person.rows[0].email,
          data: {
            name: person.rows[0].name,
            amountLabel: usdLabel(payout.amountCents),
            reason,
          },
          dedupeKey: `payout_rejected:${id}`,
        });
      }
      await notifyUser(tx, {
        userId: payout.userId,
        type: "system",
        title: "Payout request rejected",
        body: `Your ${usdLabel(payout.amountCents)} payout was rejected. The reserved amount is available again. Reason: ${reason}`,
        href: "/dashboard/referrals",
      });
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "ambassador.payout_rejected",
        entityType: "ambassador_withdrawal",
        entityId: id,
        metadata: { amountCents: payout.amountCents, reason },
      });
      return payout;
    });
    revalidatePath("/admin/ambassador-payouts");
    revalidatePath("/dashboard/referrals");
    await flushEmailQueue(5);
    return formSuccess(`Payout rejected. ${usdLabel(result.amountCents)} is available again.`);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] reject payout failed", error);
    return formError("The payout could not be rejected.");
  }
}

export async function markAmbassadorPayoutPaidAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const id = String(formData.get("payoutId") ?? "");
  const txHash = String(formData.get("transactionHash") ?? "").trim();
  if (!id) return formError("Missing payout.");
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return formError("Enter a valid BEP20 transaction hash (0x plus 64 hex characters).");
  }
  const db = await getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const current = await tx.query<{
        userId: string;
        amountCents: number;
        status: string;
        address: string;
      }>(
        `select user_id as "userId", amount_usd_cents as "amountCents",
                status, wallet_address as address
           from ambassador_withdrawals where id=$1 limit 1 for update`,
        [id],
      );
      const payout = current.rows[0];
      if (!payout) throw new AppError("NOT_FOUND", "Payout not found.");
      if (payout.status !== "processing") {
        throw new AppError(
          "CONFLICT",
          "Approve the payout and confirm the transfer before marking it paid.",
        );
      }
      await tx.query(
        `update ambassador_withdrawals
            set status='paid', paid_at=now(), transaction_hash=$2,
                processed_by=$3, updated_at=now()
          where id=$1`,
        [id, txHash, actor.admin.id],
      );
      const person = await tx.query<{ email: string; name: string }>(
        `select email, coalesce(display_name,username) as name from profiles where id=$1`,
        [payout.userId],
      );
      if (person.rows[0]) {
        await queueEmail(tx, {
          type: "payout_paid",
          userId: payout.userId,
          recipient: person.rows[0].email,
          data: {
            name: person.rows[0].name,
            amountLabel: usdLabel(payout.amountCents),
            txHash,
            address: payout.address,
          },
          dedupeKey: `payout_paid:${id}`,
        });
      }
      await notifyUser(tx, {
        userId: payout.userId,
        type: "system",
        title: "Payout completed",
        body: `Your ${usdLabel(payout.amountCents)} USDT payout has been marked paid. The transaction hash is available in your payout history.`,
        href: "/dashboard/referrals",
      });
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "ambassador.payout_paid",
        entityType: "ambassador_withdrawal",
        entityId: id,
        metadata: { amountCents: payout.amountCents, transactionHash: txHash },
      });
      return payout;
    });
    revalidatePath("/admin/ambassador-payouts");
    revalidatePath("/dashboard/referrals");
    await flushEmailQueue(5);
    return formSuccess(`Payout marked paid. Transaction hash recorded for ${usdLabel(result.amountCents)}.`);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] mark payout paid failed", error);
    return formError("The payout could not be marked paid.");
  }
}

export async function verifyAmbassadorAddressAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const addressId = String(formData.get("addressId") ?? "");
  const approve = String(formData.get("decision") ?? "") === "verify";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!addressId) return formError("Missing payout address.");
  if (!approve && reason.length < 5) {
    return formError("Add a short reason for rejecting the address.");
  }
  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      const verify = await import("@/server/services/ambassador");
      await verify.verifyAmbassadorAddress(tx, {
        addressId,
        adminId: actor.admin.id,
        adminRole: actor.admin.role,
        approve,
        reason,
      });
    });
    revalidatePath("/admin/ambassador-payouts");
    revalidatePath("/dashboard/referrals");
    return formSuccess(approve ? "USDT BEP20 address verified." : "Address rejected.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/admin] verify ambassador address failed", error);
    return formError("The address could not be updated.");
  }
}

export async function updateAmbassadorSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await adminActor();
  if (!actor.ok) return actor.state;
  const enabled = formData.get("enabled") === "on";
  const required = Number(formData.get("referralsRequired") ?? 10);
  const commission = Number(formData.get("commissionUsd") ?? 3);
  const minimum = Number(formData.get("minimumUsd") ?? 10);
  const task = String(formData.get("qualifyingTask") ?? "referral_deposit");
  const qualifyingDeposit = Number(formData.get("qualifyingDepositNgn") ?? 2000);
  const nextPayoutRaw = String(formData.get("nextPayoutAt") ?? "").trim();
  const nextPayoutAt = nextPayoutRaw ? new Date(`${nextPayoutRaw}T00:00:00+01:00`) : null;
  if (!Number.isInteger(required) || required < 1 || required > 100) {
    return formError("Qualified referrals must be a whole number from 1 to 100.");
  }
  if (!Number.isFinite(commission) || commission <= 0 || commission > 1000) {
    return formError("Enter a commission between $0.01 and $1,000.");
  }
  if (!Number.isFinite(minimum) || minimum < 10 || minimum > 100000) {
    return formError("The minimum payout must be at least $10.");
  }
  if (!["referral_deposit", "referral_first_purchase"].includes(task)) {
    return formError("Choose a valid qualifying task.");
  }
  if (!Number.isFinite(qualifyingDeposit) || qualifyingDeposit < 0) {
    return formError("Enter a valid qualifying deposit.");
  }
  if (nextPayoutAt && Number.isNaN(nextPayoutAt.getTime())) {
    return formError("Enter a valid next payout date.");
  }
  const db = await getDb();
  const meta = await getRequestMeta();
  try {
    await db.transaction(async (tx) => {
      const entries: Array<[string, unknown]> = [
        ["ambassador_enabled", enabled],
        ["ambassador_referrals_required", required],
        ["ambassador_commission_usd_cents", Math.round(commission * 100)],
        ["ambassador_withdrawal_min_usd_cents", Math.round(minimum * 100)],
        ["ambassador_qualifying_task", task],
        ["ambassador_qualifying_deposit_minor", Math.round(qualifyingDeposit * 100)],
        ["ambassador_next_payout_at", nextPayoutAt ? nextPayoutAt.toISOString() : ""],
      ];
      for (const [key, value] of entries) {
        await tx.query(
          `insert into app_settings (key,value,description)
           values ($1,$2::jsonb,'Ambassador Programme setting')
           on conflict (key) do update set value=excluded.value, updated_at=now()`,
          [key, JSON.stringify(value)],
        );
      }
      await writeAuditLog(tx, {
        actorUserId: actor.admin.id,
        actorRole: actor.admin.role,
        action: "ambassador.settings_updated",
        entityType: "system",
        entityId: null,
        metadata: {
          enabled,
          required,
          commissionCents: Math.round(commission * 100),
          minimumCents: Math.round(minimum * 100),
          task,
          qualifyingDepositMinor: Math.round(qualifyingDeposit * 100),
          nextPayoutAt: nextPayoutAt?.toISOString() ?? null,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
    revalidatePath("/admin/ambassador-payouts");
    revalidatePath("/dashboard/referrals");
    return formSuccess("Ambassador Programme settings saved.");
  } catch (error) {
    console.error("[buybiz/admin] ambassador settings failed", error);
    return formError("The Ambassador settings could not be saved.");
  }
}
