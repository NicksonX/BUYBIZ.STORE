import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { attachReferralForSignup } from "@/server/services/referrals";
import { submitAmbassadorAddress, verifyAmbassadorAddress } from "@/server/services/ambassador";
import {
  evaluateCampaignRewards,
  getUsdRewardsDashboard,
  requestCampaignPayout,
  reviewCampaignPayout,
} from "@/server/services/campaigns";
import { createTestInventory, createTestUser } from "../helpers";

beforeAll(async () => { await getDb(); });

async function productId(days: 1 | 7 = 7) {
  const db = await getDb();
  const slug = days === 7 ? "proxy-7-days" : "proxy-24-hours";
  const existing = await db.query<{ id: string }>(`select id from products where slug=$1 limit 1`, [slug]);
  if (existing.rows[0]) return existing.rows[0].id;
  const id = randomUUID();
  await db.query(
    `insert into products (id,slug,name,description,category,duration_seconds,price_minor,currency,is_active,is_coming_soon)
     values ($1,$2,$3,'Test product','proxy',$4,50000,'NGN',true,false)`,
    [id, slug, days === 7 ? "7-Day Proxy" : "24-Hour Proxy", days * 86400],
  );
  return id;
}

async function setupCampaign(overrides: Partial<{ slug: string; startsAt: Date; endsAt: Date; payoutAt: Date }> = {}) {
  const db = await getDb();
  // Isolate from every previously published campaign.
  await db.query(`update campaigns set status='paused'`);
  const id = randomUUID();
  const slug = overrides.slug ?? `test-campaign-${id.slice(0, 8)}`;
  const startsAt = overrides.startsAt ?? new Date(Date.now() - 60 * 60 * 1000);
  const endsAt = overrides.endsAt ?? new Date(Date.now() + 60 * 60 * 1000);
  const payoutAt = overrides.payoutAt ?? new Date(Date.now() + 2 * 60 * 60 * 1000);
  await db.query(
    `insert into campaigns
       (id,slug,name,description,status,customer_reward_usd_cents,referrer_reward_usd_cents,
        qualifying_deposit_minor,eligible_product_slugs,starts_at,ends_at,payout_at,timezone,terms,published_at)
     values ($1,$2,'Test Referral Campaign','Test campaign','published',1000,1000,0,'[]'::jsonb,$3,$4,$5,'Africa/Lagos','Test terms',now())`,
    [id, slug, startsAt, endsAt, payoutAt],
  );
  return { id, slug, startsAt, endsAt, payoutAt };
}

async function qualifyCustomer(options: {
  referrerId?: string;
  depositMinor?: number;
  depositedAt?: Date;
  orderedAt?: Date;
  durationDays?: 1 | 7;
  withDeposit?: boolean;
} = {}) {
  const db = await getDb();
  const customer = await createTestUser("camp");
  if (options.referrerId) {
    await db.transaction((tx) => attachReferralForSignup(tx, customer.id, "unused"));
    await db.query(`insert into referrals (referrer_id,referee_id,referral_code) values ($1,$2,'TEST') on conflict (referee_id) do nothing`, [options.referrerId, customer.id]);
  }
  const pid = await productId(options.durationDays ?? 7);
  if (options.withDeposit !== false) {
    const depositId = randomUUID();
    const reference = `CAMPAIGN-${randomUUID()}`;
    await db.query(
      `insert into deposits (id,user_id,provider,provider_reference,amount_minor,currency,status,verified_at,credited_at,created_at)
       values ($1,$2,'paystack',$3,$4,'NGN','credited',$5,$5,$5)`,
      [depositId, customer.id, reference, options.depositMinor ?? 200_000, options.depositedAt ?? new Date()],
    );
  }
  const orderId = randomUUID();
  await db.query(
    `insert into orders (id,order_number,user_id,product_id,amount_minor,currency,status,idempotency_key,created_at,completed_at)
     values ($1,$2,$3,$4,50000,'NGN','completed',$5,$6,$6)`,
    [orderId, `BZ-CAMP-${orderId.slice(0, 8)}`, customer.id, pid, `camp-${orderId}`, options.orderedAt ?? new Date()],
  );
  const inventory = await createTestInventory({ productSlug: options.durationDays === 1 ? "proxy-24-hours" : "proxy-7-days", expiresInSeconds: 40 * 86400 });
  await db.query(
    `insert into proxy_allocations (user_id,proxy_inventory_id,order_id,product_id,status,activated_at,expires_at)
     values ($1,$2,$3,$4,'active',now(),now() + interval '30 days')`,
    [customer.id, inventory.id, orderId, pid],
  );
  await db.transaction((tx) => evaluateCampaignRewards(tx, { customerId: customer.id }));
  return { customer, orderId };
}

describe("$10 customer + $10 referrer campaign", () => {
  it("awards both sides in separate USD rows, not the NGN wallet", async () => {
    const referrer = await createTestUser("campref");
    await setupCampaign();
    const { customer } = await qualifyCustomer({ referrerId: referrer.id });
    const db = await getDb();
    const rewards = await db.query<{ role: string; amountCents: number; customerId: string; referrerId: string | null }>(
      `select role, amount_usd_cents as "amountCents", customer_id as "customerId", referrer_id as "referrerId"
         from campaign_rewards where customer_id=$1 order by role`,
      [customer.id],
    );
    expect(rewards.rows).toHaveLength(2);
    expect(rewards.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "customer", amountCents: 1000, customerId: customer.id }),
      expect.objectContaining({ role: "referrer", amountCents: 1000, referrerId: referrer.id }),
    ]));
    const ngn = await db.query<{ total: number }>(`select coalesce(sum(amount_minor),0)::bigint as total from wallet_ledger where user_id in ($1,$2)`, [customer.id, referrer.id]);
    expect(Number(ngn.rows[0].total)).toBe(0);
  });

  it("awards without a separate wallet deposit on a purchase-only campaign", async () => {
    const referrer = await createTestUser("campnoref");
    await setupCampaign();
    const { customer } = await qualifyCustomer({
      referrerId: referrer.id,
      withDeposit: false,
    });
    const db = await getDb();
    const rewards = await db.query<{ count: number }>(
      `select count(*)::int as count from campaign_rewards where customer_id=$1`,
      [customer.id],
    );
    expect(rewards.rows[0].count).toBe(2);
  });

  it("awards only the customer when there is no valid referrer", async () => {
    await setupCampaign();
    const { customer } = await qualifyCustomer();
    const db = await getDb();
    const rewards = await db.query<{ role: string; count: number }>(
      `select role, count(*)::int as count from campaign_rewards where customer_id=$1 group by role`,
      [customer.id],
    );
    expect(rewards.rows).toEqual([{ role: "customer", count: 1 }]);
  });

  it("does not duplicate on repeat evaluation or for a below-threshold deposit", async () => {
    const referrer = await createTestUser("campdup");
    await setupCampaign();
    const { customer } = await qualifyCustomer({ referrerId: referrer.id });
    const db = await getDb();
    await db.transaction((tx) => evaluateCampaignRewards(tx, { customerId: customer.id }));
    const count = await db.query<{ count: number }>(`select count(*)::int as count from campaign_rewards where customer_id=$1`, [customer.id]);
    expect(count.rows[0].count).toBe(2);

    await setupCampaign({ slug: `low-${randomUUID()}` });
    await qualifyCustomer({ depositMinor: 199_999 });
    const low = await db.query<{ count: number }>(`select count(*)::int as count from campaign_rewards where customer_id=$1`, [customer.id]);
    expect(low.rows[0].count).toBe(2);
  });

  it("rewards any fulfilled proxy purchase, including 24-hour plans", async () => {
    await setupCampaign();
    const { customer } = await qualifyCustomer({ durationDays: 1 });
    const db = await getDb();
    const count = await db.query<{ count: number }>(
      `select count(*)::int as count from campaign_rewards where customer_id=$1`,
      [customer.id],
    );
    expect(count.rows[0].count).toBe(1);
  });

  it("rewards historical fulfilled purchases outside the campaign window", async () => {
    await setupCampaign({ startsAt: new Date(Date.now() - 3 * 86400_000), endsAt: new Date(Date.now() - 2 * 86400_000), payoutAt: new Date(Date.now() - 86400_000) });
    const { customer } = await qualifyCustomer({ depositedAt: new Date(Date.now() - 4 * 86400_000), orderedAt: new Date(Date.now() - 4 * 86400_000) });
    const db = await getDb();
    const count = await db.query<{ count: number }>(`select count(*)::int as count from campaign_rewards where customer_id=$1`, [customer.id]);
    expect(count.rows[0].count).toBe(1);
  });

  it("keeps campaign rewards separate and pays only with a transaction hash", async () => {
    const admin = await createTestUser("campadmin");
    await setupCampaign();
    const qualified = await qualifyCustomer({});
    const customer = qualified.customer;
    const db = await getDb();
    const reward = await db.query<{ id: string; beneficiaryId: string }>(
      `select id, beneficiary_id as "beneficiaryId" from campaign_rewards where role='customer' and customer_id=$1 order by created_at desc limit 1`,
      [customer.id],
    );
    // Make the reward available for this payout test, independent of the real payout date.
    await db.query(`update campaign_rewards set status='available', available_at=now() - interval '1 minute' where id=$1`, [reward.rows[0].id]);
    await db.query(`update profiles set role='admin' where id=$1`, [admin.id]);
    await submitAmbassadorAddress(customer.id, "0x1234567890abcdef1234567890abcdef12345678");
    const address = await db.query<{ id: string }>(`select id from ambassador_wallet_addresses where user_id=$1 and status='pending' order by created_at desc limit 1`, [customer.id]);
    await db.transaction((tx) => verifyAmbassadorAddress(tx, { addressId: address.rows[0].id, adminId: admin.id, adminRole: "admin", approve: true }));
    const payout = await requestCampaignPayout(customer.id);
    expect(payout.amountCents).toBe(1000);
    const reserved = await db.query<{ status: string }>(`select status from campaign_rewards where id=$1`, [reward.rows[0].id]);
    expect(reserved.rows[0].status).toBe("reserved");
    await reviewCampaignPayout({ actorId: admin.id, actorRole: "admin", payoutId: payout.id, decision: "approve" });
    await reviewCampaignPayout({ actorId: admin.id, actorRole: "admin", payoutId: payout.id, decision: "processing" });
    const hash = `0x${"a".repeat(64)}`;
    await reviewCampaignPayout({ actorId: admin.id, actorRole: "admin", payoutId: payout.id, decision: "paid", transactionHash: hash });
    const paid = await db.query<{ status: string; tx: string }>(`select status, transaction_hash as tx from reward_payouts where id=$1`, [payout.id]);
    expect(paid.rows[0]).toEqual({ status: "paid", tx: hash });
    const dashboard = await getUsdRewardsDashboard(customer.id);
    expect(dashboard.campaign.paidCents).toBeGreaterThanOrEqual(1000);
  });
});
