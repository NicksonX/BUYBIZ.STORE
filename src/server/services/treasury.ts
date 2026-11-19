import "server-only";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { queueEmail } from "@/server/services/email";

const BSC_RPC = process.env.BSC_RPC_URL?.trim() || "https://bsc-dataseed.binance.org/";
const USDT_BEP20 = "0x55d398326f99059ff775485246999027b3197955";

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`BSC RPC returned ${response.status}`);
  const body = (await response.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "BSC RPC error");
  return body.result as T;
}

function validEvmAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export async function getTreasuryWallet() {
  const db = await getDb();
  const r = await db.query<{
    id: string; label: string; asset: string; network: string; address: string;
    custodyMode: string; ownerAttestedAt: Date | null; enabled: boolean;
  }>(
    `select id,label,asset,network,address,custody_mode as "custodyMode",
            owner_attested_at as "ownerAttestedAt", enabled from treasury_wallets order by created_at asc limit 1`,
  );
  return r.rows[0] ?? null;
}

export async function saveTreasuryWallet(input: { adminId: string; address: string; label?: string }) {
  if (!validEvmAddress(input.address)) throw new AppError("VALIDATION", "Enter a valid BEP20 treasury address.");
  const db = await getDb();
  const existing = await getTreasuryWallet();
  if (existing) {
    await db.query(`update treasury_wallets set address=$2,label=coalesce($3,label),updated_at=now() where id=$1`, [existing.id, input.address.trim(), input.label ?? null]);
    return { id: existing.id };
  }
  const r = await db.query<{ id: string }>(
    `insert into treasury_wallets (label,asset,network,address,custody_mode,created_by) values (coalesce($2,'BUYBIZ Treasury'),'USDT','BEP20',$1,'external_hardware_wallet',$3) returning id`,
    [input.address.trim(), input.label ?? null, input.adminId],
  );
  return r.rows[0];
}

export async function attestTreasuryWallet(adminId: string) {
  const db = await getDb();
  await db.query(`update treasury_wallets set owner_attested_at=now(), enabled=true, updated_at=now() where created_by=$1 or true`, [adminId]);
  return { ok: true };
}

export async function readTreasuryBalance() {
  const wallet = await getTreasuryWallet();
  if (!wallet?.enabled) return { available: false as const, error: "Treasury wallet is not configured or attested." };
  try {
    const data = `0x70a08231${wallet.address.replace(/^0x/, "").padStart(64, "0")}`;
    const [usdtRaw, bnbRaw, block] = await Promise.all([
      rpc<string>("eth_call", [{ to: USDT_BEP20, data }, "latest"]),
      rpc<string>("eth_getBalance", [wallet.address, "latest"]),
      rpc<string>("eth_blockNumber", []),
    ]);
    return {
      available: true as const,
      address: wallet.address,
      asset: "USDT",
      network: "BEP20",
      usdt: Number(BigInt(usdtRaw)) / 1e18,
      bnb: Number(BigInt(bnbRaw)) / 1e18,
      block: Number(BigInt(block)),
      source: "BSC public RPC",
    };
  } catch (error) {
    return { available: false as const, error: error instanceof Error ? error.message : "Treasury RPC unavailable." };
  }
}

export async function prepareGiveawayBatch(giveawayId: string, adminId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const claims = await tx.query<{ id: string; userId: string; wallet: string; amount: number }>(
      `select id,user_id as "userId",wallet_address as wallet,reward_amount_usd_cents as amount
         from giveaway_claims
        where giveaway_id=$1 and payment_status='pending' and address_status='submitted'
          and wallet_address is not null
        order by claimed_at asc
        for update`,
      [giveawayId],
    );
    if (claims.rows.length === 0) throw new AppError("CONFLICT", "No claims with submitted addresses are ready for payment.");
    const total = claims.rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const batch = await tx.query<{ id: string }>(
      `insert into giveaway_payment_batches (giveaway_id,status,total_amount_usd_cents,item_count,prepared_by)
       values ($1,'prepared',$2,$3,$4) returning id`,
      [giveawayId, total, claims.rows.length, adminId],
    );
    for (const claim of claims.rows) {
      await tx.query(
        `insert into giveaway_payment_items (batch_id,claim_id,user_id,wallet_address,amount_usd_cents)
         values ($1,$2,$3,$4,$5)`,
        [batch.rows[0].id, claim.id, claim.userId, claim.wallet, claim.amount],
      );
      await tx.query(`update giveaway_claims set payment_status='approved' where id=$1`, [claim.id]);
    }
    return { batchId: batch.rows[0].id, itemCount: claims.rows.length, totalCents: total };
  });
}

export async function approveGiveawayBatch(batchId: string, ownerId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const batch = await tx.query(`update giveaway_payment_batches set status='approved',approved_by=$2,approved_at=now(),updated_at=now() where id=$1 and status='prepared' returning id`, [batchId, ownerId]);
    if (!batch.rows[0]) throw new AppError("CONFLICT", "Batch is not awaiting approval.");
    await tx.query(`update giveaway_payment_items set status='awaiting_signature' where batch_id=$1`, [batchId]);
    const recipients = await tx.query<{ userId: string; email: string; name: string; amount: number }>(
      `select i.user_id as "userId", p.email, coalesce(p.display_name,p.username) as name, i.amount_usd_cents as amount
         from giveaway_payment_items i join profiles p on p.id=i.user_id where i.batch_id=$1`,
      [batchId],
    );
    for (const person of recipients.rows) {
      await queueEmail(tx, {
        type: "giveaway_approved", userId: person.userId, recipient: person.email,
        data: { name: person.name, amountLabel: `$${(Number(person.amount) / 100).toFixed(2)} USDT`, network: "BEP20" },
        dedupeKey: `giveaway_approved:${batchId}:${person.userId}`,
      });
    }
    return { ok: true };
  });
}

export async function recordGiveawayPayment(input: { itemId: string; txHash: string }) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) throw new AppError("VALIDATION", "Enter a valid BSC transaction hash.");
  const receipt = await rpc<{ status?: string } | null>("eth_getTransactionReceipt", [input.txHash]);
  if (!receipt || receipt.status !== "0x1") throw new AppError("VALIDATION", "That transaction is not confirmed successfully on BSC.");
  const db = await getDb();
  return db.transaction(async (tx) => {
    const item = await tx.query<{ id: string; batchId: string; claimId: string; userId: string; amount: number }>(
      `select id,batch_id as "batchId",claim_id as "claimId",user_id as "userId",amount_usd_cents as amount
         from giveaway_payment_items where id=$1 for update`,
      [input.itemId],
    );
    if (!item.rows[0]) throw new AppError("NOT_FOUND", "Payment item not found.");
    const row = item.rows[0];
    await tx.query(`update giveaway_payment_items set status='confirmed',transaction_hash=$2,confirmed_at=now() where id=$1`, [row.id, input.txHash]);
    await tx.query(`update giveaway_claims set payment_status='paid',paid_at=now(),transaction_hash=$2 where id=$1`, [row.claimId, input.txHash]);
    const profile = await tx.query<{ email: string; name: string }>(`select email,coalesce(display_name,username) as name from profiles where id=$1`, [row.userId]);
    if (profile.rows[0]) {
      await queueEmail(tx, {
        type: "giveaway_winner_paid", userId: row.userId, recipient: profile.rows[0].email,
        data: { name: profile.rows[0].name, amountLabel: `$${(row.amount / 100).toFixed(2)} USDT`, txHash: input.txHash, network: "BEP20" },
        dedupeKey: `giveaway_paid:${row.claimId}`,
      });
    }
    const remaining = await tx.query<{ n: number }>(`select count(*)::int n from giveaway_payment_items where batch_id=$1 and status <> 'confirmed'`, [row.batchId]);
    if (Number(remaining.rows[0].n) === 0) await tx.query(`update giveaway_payment_batches set status='paid',updated_at=now() where id=$1`, [row.batchId]);
    return { ok: true };
  });
}

export async function getTreasuryOverview() {
  const db = await getDb();
  const [wallet, batches, items, giveaways] = await Promise.all([
    getTreasuryWallet(),
    db.query<Record<string, unknown>>(`select id,giveaway_id as "giveawayId",status,total_amount_usd_cents as "totalCents",item_count as "itemCount",prepared_by as "preparedBy",approved_by as "approvedBy",approved_at as "approvedAt",created_at as "createdAt" from giveaway_payment_batches order by created_at desc limit 100`),
    db.query<Record<string, unknown>>(`select i.id,i.batch_id as "batchId",i.claim_id as "claimId",i.user_id as "userId",i.wallet_address as "walletAddress",i.amount_usd_cents as "amountCents",i.status,i.transaction_hash as "transactionHash",p.username,p.email from giveaway_payment_items i join profiles p on p.id=i.user_id order by i.recorded_at desc limit 500`),
    db.query<Record<string, unknown>>(`select id,title,claimed_count as "claimedCount",claim_limit as "claimLimit" from giveaways order by created_at desc limit 50`),
  ]);
  return { wallet, batches: batches.rows, items: items.rows, giveaways: giveaways.rows };
}
