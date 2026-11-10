import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/security/encryption";

export function uniqueUsername(prefix = "qa") {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 24);
}

export async function createTestUser(
  prefix = "qa",
  options: { verified?: boolean; status?: "active" | "suspended" } = {},
) {
  const db = await getDb();
  const id = randomUUID();
  const username = uniqueUsername(prefix);
  const email = `${username}@test.buybiz.local`;
  await db.query(
    `insert into profiles (id, username, email, role, status, email_verified, onboarding_complete)
     values ($1,$2,$3,'customer',$4,$5,true)`,
    [id, username, email, options.status ?? "active", options.verified ?? true],
  );
  return { id, username, email };
}

export async function walletFor(userId: string) {
  const db = await getDb();
  const result = await db.query<{ id: string; balance: number }>(
    `select w.id, coalesce(sum(l.amount_minor),0)::bigint as balance
       from wallet_accounts w
       left join wallet_ledger l on l.wallet_account_id = w.id
      where w.user_id = $1
      group by w.id`,
    [userId],
  );
  return result.rows[0];
}

export async function fundWallet(userId: string, amountMinor: number) {
  const db = await getDb();
  const wallet = await walletFor(userId);
  if (!wallet) throw new Error("Wallet not found");
  await db.query(
    `insert into wallet_ledger
       (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
        currency, reference, description)
     values ($1,$2,'deposit_credit',$3,$4,'NGN',$5,'Vitest wallet funding')`,
    [
      wallet.id,
      userId,
      amountMinor,
      Number(wallet.balance) + amountMinor,
      `test:deposit:${randomUUID()}`,
    ],
  );
}

export async function pauseAllInventory() {
  const db = await getDb();
  await db.query(
    `update proxy_inventory set status = 'paused'
      where archived_at is null and status in ('available','full')`,
  );
}

export async function createTestInventory(options: {
  maxSeats?: number;
  expiresInSeconds?: number;
  status?: "available" | "paused";
} = {}) {
  const db = await getDb();
  const id = randomUUID();
  const username = await encryptSecret(`test_user_${id.slice(0, 8)}`);
  const password = await encryptSecret(`test_pass_${id.slice(0, 8)}`);
  const maxSeats = options.maxSeats ?? 10;
  const expiry = new Date(Date.now() + (options.expiresInSeconds ?? 10 * 86400) * 1000);
  await db.query(
    `insert into proxy_inventory
       (id, label, protocol, host, port, encrypted_username, encrypted_password,
        region, provider_note, purchase_cost_minor, max_seats, uploaded_at,
        upstream_expires_at, expiry_is_estimated, status)
     values ($1,$2,'socks5','203.0.113.210',1080,$3,$4,'Test','Vitest inventory',1000,$5,now(),$6,false,$7)`,
    [id, `Vitest proxy ${id.slice(0, 6)}`, username, password, maxSeats, expiry, options.status ?? "available"],
  );
  return { id, maxSeats, expiry };
}
