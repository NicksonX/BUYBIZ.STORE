import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const sql = (file: string) => readFileSync(path.join(root, file), "utf8");
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite("memory://");
  await db.exec(sql("supabase/migrations/20261110000100_core_schema.sql"));
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create or replace function auth.uid() returns uuid
      language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(sql("supabase/migrations/20261110000200_auth_and_roles.sql"));
  await db.exec(sql("supabase/migrations/20261110000300_rls.sql"));
  await db.exec(sql("supabase/migrations/20261110000500_internal_transfers.sql"));
  await db.exec(sql("supabase/migrations/20261110000510_internal_transfers_tables.sql"));
  await db.exec(sql("supabase/migrations/20261110000600_internal_transfers_rls.sql"));
  await db.exec(sql("supabase/migrations/20261110000700_referral_enum.sql"));
  await db.exec(sql("supabase/migrations/20261110000710_referrals.sql"));
  await db.exec(sql("supabase/migrations/20261110000720_personal_proxy.sql"));
  await db.exec(sql("supabase/migrations/20261110000800_referrals_rls.sql"));

  await db.query(
    `insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data)
     values ($1,'rls-a@test.local',now(),'{"username":"rls_a"}'),
            ($2,'rls-b@test.local',now(),'{"username":"rls_b"}')`,
    [userA, userB],
  );
  await db.query(
    `insert into orders (order_number,user_id,product_id,amount_minor,status,idempotency_key)
     select 'RLS-A', $1, id, 50000, 'completed', 'rls-a' from products where slug='proxy-24-hours'`,
    [userA],
  );
  await db.query(
    `insert into orders (order_number,user_id,product_id,amount_minor,status,idempotency_key)
     select 'RLS-B', $1, id, 100000, 'completed', 'rls-b' from products where slug='proxy-7-days'`,
    [userB],
  );
  await db.query(
    `insert into wallet_ledger
       (wallet_account_id,user_id,entry_type,amount_minor,balance_after_minor,currency,reference,description)
     select w.id, w.user_id, 'deposit_credit', 500000, 500000, 'NGN', 'rls-deposit-a', 'RLS test'
       from wallet_accounts w where w.user_id=$1`,
    [userA],
  );
  await db.query(
    `insert into referrals (referrer_id,referee_id,referral_code)
     select $1,$2,referral_code from profiles where id=$1`,
    [userA, userB],
  );
});

afterAll(async () => {
  await db.close();
});

async function assumeUser(userId: string) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
}

async function resetRole() {
  await db.exec("reset role");
}

describe("Supabase RLS policies", () => {
  it("shows a customer only their own orders and profile", async () => {
    await assumeUser(userA);
    const orders = await db.query<{ orderNumber: string }>(
      `select order_number as "orderNumber" from orders order by order_number`,
    );
    expect(orders.rows.map((row) => row.orderNumber)).toEqual(["RLS-A"]);

    const profiles = await db.query<{ username: string }>(
      `select username from profiles`,
    );
    expect(profiles.rows.map((row) => row.username)).toEqual(["rls_a"]);

    const otherOrder = await db.query<{ count: number }>(
      `select count(*)::int as count from orders where user_id=$1`,
      [userB],
    );
    expect(otherOrder.rows[0].count).toBe(0);
    await resetRole();
  });

  it("prevents customers from writing ledger entries or promoting themselves", async () => {
    await assumeUser(userA);
    await expect(
      db.query(
        `insert into wallet_ledger
           (wallet_account_id,user_id,entry_type,amount_minor,balance_after_minor,currency,reference,description)
         select id,user_id,'deposit_credit',999999,999999,'NGN','rls-hack','hack'
           from wallet_accounts where user_id=$1`,
        [userA],
      ),
    ).rejects.toThrow();

    await expect(
      db.query(`update profiles set role='admin' where id=$1`, [userA]),
    ).rejects.toThrow();
    await resetRole();
  });

  it("keeps encrypted inventory and transfers inaccessible to customers", async () => {
    await assumeUser(userA);
    await expect(db.query(`select host from proxy_inventory`)).rejects.toThrow();
    await expect(db.query(`select * from wallet_transfers`)).resolves.toBeDefined();
    await resetRole();
  });

  it("shows referrals only to the referrer and blocks client writes", async () => {
    await assumeUser(userA);
    const rows = await db.query<{ count: number }>(
      `select count(*)::int as count from referrals`,
    );
    expect(rows.rows[0].count).toBe(1);
    await expect(
      db.query(
        `insert into referrals (referrer_id,referee_id,referral_code)
         values ($1,$2,'CLIENT')`,
        [userA, userA],
      ),
    ).rejects.toThrow();
    await resetRole();

    await assumeUser(userB);
    const hidden = await db.query<{ count: number }>(
      `select count(*)::int as count from referrals`,
    );
    expect(hidden.rows[0].count).toBe(0);
    await resetRole();
  });

  it("lets an admin read all profiles", async () => {
    await db.query(`update profiles set role='admin' where id=$1`, [userA]);
    await assumeUser(userA);
    const profiles = await db.query<{ count: number }>(
      `select count(*)::int as count from profiles`,
    );
    expect(profiles.rows[0].count).toBe(2);
    await resetRole();
  });

  it("denies anonymous table access", async () => {
    await db.exec("set role anon");
    await expect(db.query(`select count(*) from orders`)).rejects.toThrow();
    await resetRole();
  });
});
