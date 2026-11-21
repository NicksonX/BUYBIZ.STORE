import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { queueEmail } from "@/server/services/email";
import { notifyUser } from "@/server/services/notifications";
import { writeAuditLog } from "@/server/services/audit";

export type GiveawayStatus = "draft" | "scheduled" | "active" | "paused" | "ended" | "claimed";

function codeSecret() {
  return process.env.GIVEAWAY_CODE_SECRET?.trim() || process.env.PROXY_CREDENTIAL_ENCRYPTION_KEY?.trim() || "buybiz-giveaway-local";
}
function hashCode(code: string) {
  return createHmac("sha256", codeSecret()).update(code.trim().toUpperCase()).digest("hex");
}
function randomCode() {
  return randomBytes(9).toString("base64url").replace(/[-_]/g, "").slice(0, 12).toUpperCase();
}
function isEvmAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export async function listGiveawaysForUser(userId: string) {
  const db = await getDb();
  const result = await db.query<{
    id: string; slug: string; title: string; description: string;
    rewardCents: number; asset: string; network: string;
    claimLimit: number; claimedCount: number; status: GiveawayStatus;
    startsAt: Date | null; endsAt: Date | null;
    claimId: string | null; walletAddress: string | null; addressStatus: string | null; paymentStatus: string | null;
    claimIsWinner: boolean | null; winnerPosition: number | null;
    xPostUrl: string | null; tasksEnabled: boolean; completedTasks: string[];
  }>(
    `select g.id, g.slug, g.title, g.description, g.reward_amount_usd_cents as "rewardCents",
            g.reward_asset as asset, g.network, g.claim_limit as "claimLimit",
            g.claimed_count as "claimedCount", g.status, g.starts_at as "startsAt", g.ends_at as "endsAt",
            c.id as "claimId", c.wallet_address as "walletAddress", c.address_status as "addressStatus", c.payment_status as "paymentStatus",
            c.is_winner as "claimIsWinner", c.winner_position as "winnerPosition",
            g.x_post_url as "xPostUrl", g.tasks_enabled as "tasksEnabled",
            coalesce(array(select tc.task_key from giveaway_task_completions tc where tc.giveaway_id=g.id and tc.user_id=$1), '{}') as "completedTasks"
       from giveaways g
       left join giveaway_claims c on c.giveaway_id = g.id and c.user_id = $1
      where g.status in ('scheduled','active')
      order by case g.status when 'active' then 0 when 'scheduled' then 1 else 2 end, g.created_at desc
      limit 30`,
    [userId],
  );
  return result.rows;
}

export async function claimGiveaway(input: { userId: string; giveawayId: string; code: string }) {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new AppError("VALIDATION", "Enter the giveaway claim code.");
  const db = await getDb();
  return db.transaction(async (tx) => {
    const result = await tx.query<{
      id: string; status: GiveawayStatus; claimLimit: number; claimedCount: number;
      startsAt: Date | null; endsAt: Date | null; rewardCents: number; codeHash: string;
    }>(
      `select id, status, claim_limit as "claimLimit", claimed_count as "claimedCount",
              starts_at as "startsAt", ends_at as "endsAt",
              reward_amount_usd_cents as "rewardCents", code_hash as "codeHash"
         from giveaways where id=$1 for update`,
      [input.giveawayId],
    );
    const giveaway = result.rows[0];
    if (!giveaway) throw new AppError("NOT_FOUND", "That giveaway was not found.");
    const now = Date.now();
    if (!["active", "claimed"].includes(giveaway.status)) throw new AppError("CONFLICT", "This giveaway is not accepting claims right now.");
    if (giveaway.startsAt && new Date(giveaway.startsAt).getTime() > now) throw new AppError("CONFLICT", "This giveaway has not started yet.");
    if (giveaway.endsAt && new Date(giveaway.endsAt).getTime() <= now) throw new AppError("CONFLICT", "This giveaway has ended.");
    if (giveaway.codeHash !== hashCode(code)) throw new AppError("VALIDATION", "That claim code is not valid.");
    const existing = await tx.query(`select 1 from giveaway_claims where giveaway_id=$1 and user_id=$2`, [giveaway.id, input.userId]);
    if (existing.rows[0]) throw new AppError("CONFLICT", "You have already claimed this giveaway.");
    const winners = await tx.query<{ n: number }>(
      `select count(*)::int n from giveaway_claims where giveaway_id=$1 and is_winner=true`,
      [giveaway.id],
    );
    const winner = Number(winners.rows[0]?.n ?? 0) < giveaway.claimLimit;
    const position = winner ? Number(winners.rows[0]?.n ?? 0) + 1 : null;
    const claim = await tx.query<{ id: string }>(
      `insert into giveaway_claims (giveaway_id, user_id, reward_amount_usd_cents, address_status, payment_status, is_winner, winner_position)
       values ($1,$2,$3,'missing',$4,$5,$6) returning id`,
      [giveaway.id, input.userId, winner ? giveaway.rewardCents : 0, winner ? 'pending' : 'not_selected', winner, position],
    );
    await tx.query(
      `update giveaways set claimed_count=claimed_count+1,status='active',updated_at=now() where id=$1`,
      [giveaway.id],
    );
    await tx.query(`insert into giveaway_claim_attempts (giveaway_id,user_id,result) values ($1,$2,'success')`, [giveaway.id, input.userId]);
    return { claimId: claim.rows[0].id, alreadyClaimed: false, isWinner: winner, winnerPosition: position };
  });
}

export async function submitGiveawayWallet(input: { userId: string; claimId: string; address: string }) {
  if (!isEvmAddress(input.address)) {
    throw new AppError("VALIDATION", "Enter a valid USDT BEP20 address starting with 0x and containing 40 hexadecimal characters.");
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    const claim = await tx.query<{ id: string; paymentStatus: string; isWinner: boolean }>(
      `select id, payment_status as "paymentStatus", is_winner as "isWinner" from giveaway_claims where id=$1 and user_id=$2 for update`,
      [input.claimId, input.userId],
    );
    if (!claim.rows[0]) throw new AppError("NOT_FOUND", "That giveaway claim was not found.");
    if (!claim.rows[0].isWinner) throw new AppError("CONFLICT", "This participation is recorded, but the 20 reward slots have already been filled.");
    if (["processing", "paid"].includes(claim.rows[0].paymentStatus)) throw new AppError("CONFLICT", "This payout address is locked because payment has started.");
    await tx.query(
      `update giveaway_claims set wallet_address=$2, address_status='submitted' where id=$1 and user_id=$3`,
      [input.claimId, input.address.trim(), input.userId],
    );
    const notice = await tx.query<{ email: string; name: string; title: string; rewardCents: number; asset: string; network: string }>(
      `select p.email, coalesce(p.display_name,p.username) name, g.title, g.reward_amount_usd_cents as "rewardCents", g.reward_asset as asset, g.network
         from giveaway_claims c join profiles p on p.id=c.user_id join giveaways g on g.id=c.giveaway_id
        where c.id=$1 limit 1`,
      [input.claimId],
    );
    const info = notice.rows[0];
    if (info) await queueEmail(tx, {
      type: "giveaway_claim_received", userId: input.userId, recipient: info.email,
      data: { name: info.name, giveawayTitle: info.title, amountLabel: `$${(Number(info.rewardCents) / 100).toFixed(2)} ${info.asset}`, network: info.network },
      dedupeKey: `giveaway_claim_received:${input.claimId}`,
    });
    if (info) await notifyUser(tx, {
      userId: input.userId, type: "system", title: "Giveaway claim received",
      body: `Your claim for ${info.title} is saved and awaiting payout review. This is not a payment confirmation.`,
      href: "/dashboard/giveaways",
    });
    return { ok: true };
  });
}

export async function createGiveaway(input: {
  adminId: string; title: string; description?: string; rewardCents: number; claimLimit: number;
  asset?: string; network?: string; startsAt?: Date | null; endsAt?: Date | null;
  xPostUrl?: string | null; tasksEnabled?: boolean;
}) {
  if (!Number.isSafeInteger(input.rewardCents) || input.rewardCents <= 0) throw new AppError("VALIDATION", "Enter a valid reward amount.");
  if (!Number.isSafeInteger(input.claimLimit) || input.claimLimit < 1 || input.claimLimit > 10000) throw new AppError("VALIDATION", "Claim limit must be between 1 and 10,000.");
  const db = await getDb();
  const code = randomCode();
  const encrypted = await encryptSecret(code);
  const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${randomBytes(3).toString("hex")}`;
  const inserted = await db.query<{ id: string }>(
    `insert into giveaways (slug,title,description,reward_amount_usd_cents,reward_asset,network,claim_limit,code_hash,code_encrypted,status,starts_at,ends_at,created_by,x_post_url,tasks_enabled)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,$12,$13,$14) returning id`,
    [slug, input.title.trim(), input.description?.trim() ?? "", input.rewardCents, input.asset ?? "USDT", input.network ?? "BEP20", input.claimLimit, hashCode(code), encrypted, input.startsAt ?? null, input.endsAt ?? null, input.adminId, input.xPostUrl?.trim() || null, input.tasksEnabled !== false],
  );
  return { id: inserted.rows[0].id, code, slug };
}

export async function getGiveawayAdminData() {
  const db = await getDb();
  const giveaways = await db.query<Record<string, unknown>>(
    `select id, slug, title, description, reward_amount_usd_cents as "rewardCents", reward_asset as asset,
            network, claim_limit as "claimLimit", claimed_count as "claimedCount", status,
            starts_at as "startsAt", ends_at as "endsAt", created_at as "createdAt",
            x_post_url as "xPostUrl", tasks_enabled as "tasksEnabled"
       from giveaways order by created_at desc`,
  );
  const claims = await db.query<Record<string, unknown>>(
    `select c.id, c.giveaway_id as "giveawayId", c.user_id as "userId", c.reward_amount_usd_cents as "rewardCents",
            c.wallet_address as "walletAddress", c.address_status as "addressStatus",
            c.payment_status as "paymentStatus", c.transaction_hash as "transactionHash",
            c.is_winner as "isWinner", c.winner_position as "winnerPosition",
            c.claimed_at as "claimedAt", p.username, p.email, g.network
       from giveaway_claims c join profiles p on p.id=c.user_id join giveaways g on g.id=c.giveaway_id
      order by c.claimed_at desc limit 500`,
  );
  return { giveaways: giveaways.rows, claims: claims.rows };
}

export async function getGiveawayCode(id: string) {
  const db = await getDb();
  const r = await db.query<{ encrypted: string }>(`select code_encrypted as encrypted from giveaways where id=$1`, [id]);
  if (!r.rows[0]) throw new AppError("NOT_FOUND", "Giveaway not found.");
  return decryptSecret(r.rows[0].encrypted);
}

export async function setGiveawayStatus(id: string, status: GiveawayStatus) {
  const db = await getDb();
  await db.query(`update giveaways set status=$2, updated_at=now() where id=$1`, [id, status]);
  return { ok: true };
}

export async function announceGiveaway(id: string) {
  const db = await getDb();
  const g = await db.query<{ title: string; rewardCents: number; asset: string; network: string; startsAt: Date | null; endsAt: Date | null }>(
    `select title, reward_amount_usd_cents as "rewardCents", reward_asset as asset, network,
            starts_at as "startsAt", ends_at as "endsAt"
       from giveaways where id=$1 and status='active'`,
    [id],
  );
  if (!g.rows[0]) return { queued: 0, eligible: 0 };
  const giveaway = g.rows[0];
  const format = (value: Date | null) => value
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value)) + " (Africa/Lagos)"
    : "See the giveaway page";
  const startsAtLabel = format(giveaway.startsAt);
  const endsAtLabel = format(giveaway.endsAt);
  const data = {
    giveawayTitle: giveaway.title,
    amountLabel: `$${(giveaway.rewardCents / 100).toFixed(2)} ${giveaway.asset}`,
    startsAtLabel,
    endsAtLabel,
  };
  const users = await db.query<{ id: string; email: string; username: string }>(
    `select id,email,username from profiles where role='customer' and status='active' and email_verified=true`,
  );
  let queued = 0;
  for (const user of users.rows) {
    const deliveryId = await db.transaction((tx) => queueEmail(tx, {
      type: "giveaway_live", userId: user.id, recipient: user.email,
      data: { ...data, name: user.username },
      dedupeKey: `giveaway_live:${id}:${user.id}`,
    }));
    if (deliveryId) queued += 1;
  }
  return { queued, eligible: users.rows.length };
}

export async function getGiveawayAnnouncementStats(giveawayId: string) {
  const db = await getDb();
  const prefix = `giveaway_live:${giveawayId}:%`;
  const [counts, eligible] = await Promise.all([
    db.query<{ status: string; n: number }>(
      `select status,count(*)::int n from email_deliveries
        where email_type='giveaway_live' and dedupe_key like $1
        group by status`,
      [prefix],
    ),
    db.query<{ n: number }>(
      `select count(*)::int n from profiles where role='customer' and status='active' and email_verified=true`,
    ),
  ]);
  const map = new Map(counts.rows.map((row) => [row.status, Number(row.n)]));
  const statuses = ["queued", "sending", "sent", "failed", "disabled", "not_configured"] as const;
  const byStatus = Object.fromEntries(statuses.map((status) => [status, map.get(status) ?? 0])) as Record<(typeof statuses)[number], number>;
  return { statuses: byStatus, total: counts.rows.reduce((sum, row) => sum + Number(row.n), 0), eligible: Number(eligible.rows[0]?.n ?? 0) };
}


const GIVEAWAY_TASK_KEYS = ["follow_x", "like_post", "repost_quote", "join_telegram"] as const;
export type GiveawayTaskKey = (typeof GIVEAWAY_TASK_KEYS)[number];

export async function completeGiveawayTask(input: { userId: string; giveawayId: string; taskKey: string; reposted?: boolean; quoted?: boolean }) {
  if (!GIVEAWAY_TASK_KEYS.includes(input.taskKey as GiveawayTaskKey)) throw new AppError("VALIDATION", "Unknown giveaway task.");
  const db = await getDb();
  return db.transaction(async (tx) => {
    const g = await tx.query<{ id: string; status: string; startsAt: Date | null; endsAt: Date | null; tasksEnabled: boolean; xPostUrl: string | null }>(
      `select id,status,starts_at as "startsAt",ends_at as "endsAt",tasks_enabled as "tasksEnabled",x_post_url as "xPostUrl" from giveaways where id=$1 for update`,
      [input.giveawayId],
    );
    const giveaway = g.rows[0];
    if (!giveaway) throw new AppError("NOT_FOUND", "That giveaway was not found.");
    const now = Date.now();
    if (giveaway.status !== "active" || !giveaway.tasksEnabled) throw new AppError("CONFLICT", "This giveaway is not accepting task participation right now.");
    if (giveaway.startsAt && new Date(giveaway.startsAt).getTime() > now) throw new AppError("CONFLICT", "This giveaway has not started yet.");
    if (giveaway.endsAt && new Date(giveaway.endsAt).getTime() <= now) throw new AppError("CONFLICT", "This giveaway has ended.");
    if (["like_post", "repost_quote"].includes(input.taskKey) && !giveaway.xPostUrl) throw new AppError("CONFLICT", "The official giveaway post has not been configured yet.");
    if (input.taskKey === "repost_quote" && (!input.reposted || !input.quoted)) throw new AppError("VALIDATION", "Confirm both the repost and your quote.");
    await tx.query(
      `insert into giveaway_task_completions (giveaway_id,user_id,task_key,verification_method)
       values ($1,$2,$3,'self_reported') on conflict (giveaway_id,user_id,task_key) do nothing`,
      [giveaway.id, input.userId, input.taskKey],
    );
    await writeAuditLog(tx, { actorUserId: input.userId, actorRole: "customer", action: "giveaway.task_self_reported", entityType: "giveaway", entityId: giveaway.id, metadata: { taskKey: input.taskKey, verificationMethod: "self_reported" } });
    return { completed: true, verificationMethod: "self_reported" as const };
  });
}

export async function updateGiveawaySettings(input: { id: string; xPostUrl?: string | null; tasksEnabled?: boolean; title?: string; description?: string; startsAt?: Date | null; endsAt?: Date | null }) {
  const db = await getDb();
  await db.query(
    `update giveaways set x_post_url=$2, tasks_enabled=$3,
            title=coalesce(nullif($4,''),title), description=coalesce($5,description),
            starts_at=$6, ends_at=$7, updated_at=now() where id=$1`,
    [input.id, input.xPostUrl?.trim() || null, input.tasksEnabled !== false, input.title?.trim() ?? "", input.description?.trim() ?? null, input.startsAt ?? null, input.endsAt ?? null],
  );
  return { ok: true };
}
