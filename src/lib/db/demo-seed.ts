import { randomUUID } from "node:crypto";
import type { Database, SqlParam, SqlTransaction } from "@/lib/db/driver";
import { encryptSecret } from "@/lib/security/encryption";
import { hashPassword } from "@/lib/security/password";

const CUSTOMER_PASSWORD = "Demo1234!";
const ADMIN_PASSWORD = "Admin1234!";
const SUPPORT_PASSWORD = "Support1234!";

const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;

const ADMIN_ID = "a0000000-0000-4000-8000-000000000001";
const SUPPORT_ID = "a0000000-0000-4000-8000-000000000002";

type CustomerSeed = {
  n: number;
  id: string;
  username: string;
  displayName: string;
  email: string;
  targetBalanceMinor: number;
};

const customers: CustomerSeed[] = [
  {
    n: 1,
    id: "c0000000-0000-4000-8000-000000000001",
    username: "ademola",
    displayName: "Ademola Okafor",
    email: "demo@buybiz.test",
    targetBalanceMinor: 24_750_000,
  },
  {
    n: 2,
    id: "c0000000-0000-4000-8000-000000000002",
    username: "zainab",
    displayName: "Zainab Bello",
    email: "zainab@buybiz.test",
    targetBalanceMinor: 12_840_000,
  },
  {
    n: 3,
    id: "c0000000-0000-4000-8000-000000000003",
    username: "chinedu",
    displayName: "Chinedu Eze",
    email: "chinedu@buybiz.test",
    targetBalanceMinor: 9_675_000,
  },
  {
    n: 4,
    id: "c0000000-0000-4000-8000-000000000004",
    username: "fatima",
    displayName: "Fatima Yusuf",
    email: "fatima@buybiz.test",
    targetBalanceMinor: 7_200_000,
  },
  {
    n: 5,
    id: "c0000000-0000-4000-8000-000000000005",
    username: "tunde",
    displayName: "Tunde Adeyemi",
    email: "tunde@buybiz.test",
    targetBalanceMinor: 5_830_000,
  },
  {
    n: 6,
    id: "c0000000-0000-4000-8000-000000000006",
    username: "ngozi",
    displayName: "Ngozi Nwosu",
    email: "ngozi@buybiz.test",
    targetBalanceMinor: 4_490_000,
  },
  {
    n: 7,
    id: "c0000000-0000-4000-8000-000000000007",
    username: "ibrahim",
    displayName: "Ibrahim Musa",
    email: "ibrahim@buybiz.test",
    targetBalanceMinor: 3_160_000,
  },
  {
    n: 8,
    id: "c0000000-0000-4000-8000-000000000008",
    username: "halima",
    displayName: "Halima Sani",
    email: "halima@buybiz.test",
    targetBalanceMinor: 2_215_000,
  },
];

type InventorySeed = {
  key: string;
  id: string;
  label: string;
  protocol: "http" | "https" | "socks4" | "socks5";
  host: string;
  port: number;
  username: string;
  password: string;
  region: string;
  providerNote: string;
  costMinor: number;
  maxSeats: number;
  uploadDaysAgo: number;
  expiryDaysFromNow: number;
  status: "available" | "full" | "paused" | "expired" | "disabled";
  estimated: boolean;
  accessType?: "shared" | "single";
  notes: string;
};

const inventorySeeds: InventorySeed[] = [
  {
    key: "i1",
    id: "b0000000-0000-4000-8000-000000000001",
    label: "Lagos Datacenter 01",
    protocol: "socks5",
    host: "203.0.113.24",
    port: 1080,
    username: "bzb_lagos_01",
    password: "demo-lagos-8f31",
    region: "Nigeria",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 180_000,
    maxSeats: 10,
    uploadDaysAgo: 45,
    expiryDaysFromNow: 80,
    status: "available",
    estimated: false,
    notes: "Seeded demo inventory for local development.",
  },
  {
    key: "i2",
    id: "b0000000-0000-4000-8000-000000000002",
    label: "U.S. Residential 04",
    protocol: "http",
    host: "198.51.100.42",
    port: 8080,
    username: "bzb_us_res_04",
    password: "demo-us-res-71ad",
    region: "United States",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 450_000,
    maxSeats: 10,
    uploadDaysAgo: 30,
    expiryDaysFromNow: 55,
    status: "full",
    estimated: false,
    notes: "Demonstrates a fully allocated proxy.",
  },
  {
    key: "i3",
    id: "b0000000-0000-4000-8000-000000000003",
    label: "UK Mobile 02",
    protocol: "socks5",
    host: "203.0.113.87",
    port: 1080,
    username: "bzb_uk_mob_02",
    password: "demo-uk-mob-2c90",
    region: "United Kingdom",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 380_000,
    maxSeats: 10,
    uploadDaysAgo: 25,
    expiryDaysFromNow: 70,
    status: "available",
    estimated: true,
    notes: "Expiry assumed from the demo upload date.",
  },
  {
    key: "i4",
    id: "b0000000-0000-4000-8000-000000000004",
    label: "Frankfurt Datacenter 03",
    protocol: "https",
    host: "198.51.100.19",
    port: 3128,
    username: "bzb_fra_dc_03",
    password: "demo-fra-dc-a142",
    region: "Germany",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 150_000,
    maxSeats: 10,
    uploadDaysAgo: 20,
    expiryDaysFromNow: 100,
    status: "available",
    estimated: true,
    notes: "",
  },
  {
    key: "i5",
    id: "b0000000-0000-4000-8000-000000000005",
    label: "Singapore Datacenter 07",
    protocol: "socks5",
    host: "203.0.113.55",
    port: 1080,
    username: "bzb_sg_dc_07",
    password: "demo-sg-dc-e5c2",
    region: "Singapore",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 140_000,
    maxSeats: 10,
    uploadDaysAgo: 40,
    expiryDaysFromNow: 40,
    status: "paused",
    estimated: true,
    notes: "Paused by an admin in the demo dataset.",
  },
  {
    key: "i6",
    id: "b0000000-0000-4000-8000-000000000006",
    label: "U.S. Datacenter 11",
    protocol: "http",
    host: "192.0.2.10",
    port: 8000,
    username: "bzb_us_dc_11",
    password: "demo-us-dc-33be",
    region: "United States",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 90_000,
    maxSeats: 10,
    uploadDaysAgo: 60,
    expiryDaysFromNow: -2,
    status: "expired",
    estimated: false,
    notes: "Expired inventory; must not be allocated to new customers.",
  },
  {
    key: "i7",
    id: "b0000000-0000-4000-8000-000000000007",
    label: "Canada Residential 09",
    protocol: "https",
    host: "192.0.2.77",
    port: 8443,
    username: "bzb_ca_res_09",
    password: "demo-ca-res-90f4",
    region: "Canada",
    providerNote: "Demo supplier. Reserved documentation IP",
    costMinor: 420_000,
    maxSeats: 10,
    uploadDaysAgo: 15,
    expiryDaysFromNow: 95,
    status: "available",
    estimated: false,
    notes: "",
  },
  {
    key: "i8",
    id: "b0000000-0000-4000-8000-000000000008",
    label: "Archived EU Pool 01",
    protocol: "http",
    host: "192.0.2.41",
    port: 8080,
    username: "bzb_arch_eu_01",
    password: "demo-arch-eu-1a2b",
    region: "Netherlands",
    providerNote: "Historical demo inventory",
    costMinor: 120_000,
    maxSeats: 10,
    uploadDaysAgo: 280,
    expiryDaysFromNow: -240,
    status: "expired",
    estimated: true,
    notes: "Historical record retained for reporting.",
  },
  {
    key: "i9",
    id: "b0000000-0000-4000-8000-000000000009",
    label: "Archived US Pool 04",
    protocol: "socks5",
    host: "192.0.2.58",
    port: 1080,
    username: "bzb_arch_us_04",
    password: "demo-arch-us-4c3d",
    region: "United States",
    providerNote: "Historical demo inventory",
    costMinor: 110_000,
    maxSeats: 10,
    uploadDaysAgo: 260,
    expiryDaysFromNow: -120,
    status: "expired",
    estimated: true,
    notes: "Historical record retained for reporting.",
  },
  {
    key: "i10",
    id: "b0000000-0000-4000-8000-000000000010",
    label: "Archived UK Pool 02",
    protocol: "https",
    host: "198.51.100.88",
    port: 3128,
    username: "bzb_arch_uk_02",
    password: "demo-arch-uk-5d4e",
    region: "United Kingdom",
    providerNote: "Historical demo inventory",
    costMinor: 95_000,
    maxSeats: 10,
    uploadDaysAgo: 160,
    expiryDaysFromNow: -70,
    status: "expired",
    estimated: true,
    notes: "",
  },
  {
    key: "i11",
    id: "b0000000-0000-4000-8000-000000000011",
    label: "Archived DE Pool 03",
    protocol: "socks5",
    host: "198.51.100.93",
    port: 1080,
    username: "bzb_arch_de_03",
    password: "demo-arch-de-6e5f",
    region: "Germany",
    providerNote: "Historical demo inventory",
    costMinor: 100_000,
    maxSeats: 10,
    uploadDaysAgo: 150,
    expiryDaysFromNow: -58,
    status: "expired",
    estimated: true,
    notes: "",
  },
  {
    key: "i12",
    id: "b0000000-0000-4000-8000-000000000012",
    label: "Archived Lagos Pool 06",
    protocol: "http",
    host: "203.0.113.112",
    port: 8080,
    username: "bzb_arch_lag_06",
    password: "demo-arch-lag-7f60",
    region: "Nigeria",
    providerNote: "Historical demo inventory",
    costMinor: 130_000,
    maxSeats: 10,
    uploadDaysAgo: 120,
    expiryDaysFromNow: -10,
    status: "expired",
    estimated: true,
    notes: "",
  },
  {
    key: "i13",
    id: "b0000000-0000-4000-8000-000000000013",
    label: "Personal London 01",
    protocol: "socks5",
    host: "203.0.113.150",
    port: 1080,
    username: "bzb_personal_lon_01",
    password: "demo-personal-2b71",
    region: "United Kingdom",
    providerNote: "Demo personal proxy. One customer only.",
    costMinor: 350_000,
    maxSeats: 1,
    uploadDaysAgo: 2,
    expiryDaysFromNow: 55,
    status: "available",
    estimated: false,
    accessType: "single",
    notes: "Seeded for the Personal 30-Day Proxy.",
  },
];

type PlanKey = "proxy-24-hours" | "proxy-7-days" | "proxy-30-days";

const planDuration: Record<PlanKey, number> = {
  "proxy-24-hours": 24 * 3600,
  "proxy-7-days": 7 * 24 * 3600,
  "proxy-30-days": 30 * 24 * 3600,
};

type OrderSeed = {
  id: string;
  orderNumber: string;
  customerN: number;
  plan: PlanKey;
  amountMinor: number;
  status: "completed" | "refunded";
  createdAt: Date;
  allocation?: {
    inventoryKey: string;
    activatedAt: Date;
    expiresAt: Date;
    status: "active" | "expired";
    endedAt?: Date;
  };
  failureReason?: string;
};

const inventoryByKey = Object.fromEntries(
  inventorySeeds.map((item) => [item.key, item]),
);

const productName: Record<PlanKey, string> = {
  "proxy-24-hours": "24-Hour Proxy",
  "proxy-7-days": "7-Day Proxy",
  "proxy-30-days": "30-Day Proxy",
};

const productPrice: Record<PlanKey, number> = {
  "proxy-24-hours": 50_000,
  "proxy-7-days": 100_000,
  "proxy-30-days": 300_000,
};

function ago(ms: number) {
  return new Date(NOW - ms);
}

function daysAgo(days: number) {
  return ago(days * DAY);
}

function hoursAgo(hours: number) {
  return ago(hours * HOUR);
}

function fromNow(days: number) {
  return new Date(NOW + days * DAY);
}

function inHours(hours: number) {
  return new Date(NOW + hours * HOUR);
}

export async function seedDemoData(db: Database) {
  const seeded = await db.query<{ value: string }>(
    `select value::text as value from app_settings where key = 'demo_seed_version'`,
  );
  if (seeded.rows.length > 0) return;

  const [customerHash, adminHash, supportHash] = await Promise.all([
    hashPassword(CUSTOMER_PASSWORD),
    hashPassword(ADMIN_PASSWORD),
    hashPassword(SUPPORT_PASSWORD),
  ]);

  const encryptedCredentials = new Map<
    string,
    { username: string; password: string }
  >();
  for (const item of inventorySeeds) {
    encryptedCredentials.set(item.key, {
      username: await encryptSecret(item.username),
      password: await encryptSecret(item.password),
    });
  }

  await db.transaction(async (tx) => {
    // ------------------------------------------------------------
    // Profiles and demo credentials
    // ------------------------------------------------------------
    await tx.query(
      `insert into profiles
         (id, username, email, display_name, role, status, email_verified,
          onboarding_complete, created_at, updated_at)
       values
         ($1, 'buybizadmin', 'admin@buybiz.test', 'BUYBIZ Admin', 'super_admin', 'active', true, true, $2, $2),
         ($3, 'support', 'support@buybiz.test', 'BUYBIZ Support', 'support', 'active', true, true, $2, $2)`,
      [ADMIN_ID, daysAgo(240), SUPPORT_ID],
    );

    for (const customer of customers) {
      await tx.query(
        `insert into profiles
           (id, username, email, display_name, role, status, email_verified,
            onboarding_complete, created_at, updated_at)
         values ($1, $2, $3, $4, 'customer', 'active', true, true, $5, $5)`,
        [
          customer.id,
          customer.username,
          customer.email,
          customer.displayName,
          daysAgo(200 - customer.n * 3),
        ],
      );
    }

    const credentialRows: string[] = [];
    const credentialValues: SqlParam[] = [];
    let credentialIndex = 1;
    function addCredential(userId: string, email: string, hash: string) {
      credentialRows.push(
        `($${credentialIndex++}, $${credentialIndex++}, $${credentialIndex++})`,
      );
      credentialValues.push(userId, email, hash);
    }
    addCredential(ADMIN_ID, "admin@buybiz.test", adminHash);
    addCredential(SUPPORT_ID, "support@buybiz.test", supportHash);
    for (const customer of customers) {
      addCredential(customer.id, customer.email, customerHash);
    }
    await tx.query(
      `insert into demo_credentials (user_id, email, password_hash) values ${credentialRows.join(", ")}`,
      credentialValues,
    );

    // ------------------------------------------------------------
    // Proxy inventory
    // ------------------------------------------------------------
    for (const item of inventorySeeds) {
      const encrypted = encryptedCredentials.get(item.key)!;
      const uploadedAt = daysAgo(item.uploadDaysAgo);
      const expiresAt =
        item.expiryDaysFromNow >= 0
          ? new Date(uploadedAt.getTime() + (item.uploadDaysAgo + item.expiryDaysFromNow) * DAY)
          : new Date(NOW + item.expiryDaysFromNow * DAY);
      await tx.query(
        `insert into proxy_inventory
           (id, label, protocol, host, port, encrypted_username, encrypted_password,
            region, provider_note, purchase_cost_minor, currency, max_seats,
            access_type, uploaded_at, upstream_expires_at, expiry_is_estimated,
            status, admin_notes, created_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NGN',$11,$12,$13,$14,$15,$16,$17,$18,$13,$13)`,
        [
          item.id,
          item.label,
          item.protocol,
          item.host,
          item.port,
          encrypted.username,
          encrypted.password,
          item.region,
          item.providerNote,
          item.costMinor,
          item.maxSeats,
          item.accessType ?? "shared",
          uploadedAt,
          expiresAt,
          item.estimated,
          item.status,
          item.notes,
          ADMIN_ID,
        ],
      );
    }

    // ------------------------------------------------------------
    // Orders and allocations
    // ------------------------------------------------------------
    const orders: OrderSeed[] = [];
    let sequence = 0;

    function nextOrder(
      customerN: number,
      plan: PlanKey,
      status: "completed" | "refunded",
      createdAt: Date,
      options?: {
        allocation?: OrderSeed["allocation"];
        failureReason?: string;
      },
    ): OrderSeed {
      sequence += 1;
      return {
        id: randomUUID(),
        orderNumber: `BZ-DEMO-${String(sequence).padStart(4, "0")}`,
        customerN,
        plan,
        amountMinor: productPrice[plan],
        status,
        createdAt,
        allocation: options?.allocation,
        failureReason: options?.failureReason,
      };
    }

    type ActiveSpec = {
      customer: number;
      inventory: string;
      plan: PlanKey;
      activeMsAgo: number;
    };

    const activeSpecs: ActiveSpec[] = [
      { customer: 1, inventory: "i1", plan: "proxy-30-days", activeMsAgo: 25 * DAY },
      { customer: 1, inventory: "i1", plan: "proxy-7-days", activeMsAgo: 3 * DAY },
      { customer: 1, inventory: "i7", plan: "proxy-30-days", activeMsAgo: 1 * DAY },
      { customer: 2, inventory: "i1", plan: "proxy-30-days", activeMsAgo: 12 * DAY },
      { customer: 2, inventory: "i2", plan: "proxy-7-days", activeMsAgo: 4 * DAY },
      { customer: 2, inventory: "i3", plan: "proxy-30-days", activeMsAgo: 6 * DAY },
      { customer: 3, inventory: "i1", plan: "proxy-7-days", activeMsAgo: 2 * DAY },
      { customer: 3, inventory: "i2", plan: "proxy-30-days", activeMsAgo: 9 * DAY },
      { customer: 3, inventory: "i4", plan: "proxy-7-days", activeMsAgo: 1 * DAY },
      { customer: 4, inventory: "i1", plan: "proxy-30-days", activeMsAgo: 8 * DAY },
      { customer: 4, inventory: "i2", plan: "proxy-7-days", activeMsAgo: 3 * DAY },
      { customer: 4, inventory: "i3", plan: "proxy-24-hours", activeMsAgo: 20 * HOUR },
      { customer: 5, inventory: "i1", plan: "proxy-7-days", activeMsAgo: 36 * HOUR },
      { customer: 5, inventory: "i2", plan: "proxy-30-days", activeMsAgo: 5 * DAY },
      { customer: 6, inventory: "i1", plan: "proxy-24-hours", activeMsAgo: 12 * HOUR },
      { customer: 6, inventory: "i2", plan: "proxy-7-days", activeMsAgo: 2 * DAY },
      { customer: 6, inventory: "i3", plan: "proxy-30-days", activeMsAgo: 11 * DAY },
      { customer: 6, inventory: "i4", plan: "proxy-7-days", activeMsAgo: 4 * DAY },
      { customer: 7, inventory: "i1", plan: "proxy-30-days", activeMsAgo: 14 * DAY },
      { customer: 7, inventory: "i2", plan: "proxy-24-hours", activeMsAgo: 10 * HOUR },
      { customer: 7, inventory: "i3", plan: "proxy-7-days", activeMsAgo: 1 * DAY },
      { customer: 8, inventory: "i1", plan: "proxy-7-days", activeMsAgo: 4 * DAY },
      { customer: 8, inventory: "i2", plan: "proxy-30-days", activeMsAgo: 7 * DAY },
      { customer: 8, inventory: "i2", plan: "proxy-7-days", activeMsAgo: 3 * DAY },
      { customer: 2, inventory: "i2", plan: "proxy-30-days", activeMsAgo: 2 * DAY },
      { customer: 4, inventory: "i2", plan: "proxy-7-days", activeMsAgo: 1 * DAY },
    ];

    for (const spec of activeSpecs) {
      const activatedAt = ago(spec.activeMsAgo);
      const expiresAt = new Date(
        activatedAt.getTime() + planDuration[spec.plan] * 1000,
      );
      orders.push(
        nextOrder(spec.customer, spec.plan, "completed", activatedAt, {
          allocation: {
            inventoryKey: spec.inventory,
            activatedAt,
            expiresAt,
            status: "active",
          },
        }),
      );
    }

    // Main demo customer: recent expired access and a no-stock wallet refund.
    const expiredSpecs: Array<{
      customer: number;
      inventory: string;
      plan: PlanKey;
      activatedAt: Date;
    }> = [
      { customer: 1, inventory: "i2", plan: "proxy-7-days", activatedAt: daysAgo(10) },
      { customer: 1, inventory: "i2", plan: "proxy-24-hours", activatedAt: hoursAgo(36) },
      { customer: 1, inventory: "i2", plan: "proxy-7-days", activatedAt: daysAgo(28) },
      { customer: 1, inventory: "i12", plan: "proxy-30-days", activatedAt: daysAgo(55) },
    ];
    for (const spec of expiredSpecs) {
      const expiresAt = new Date(
        spec.activatedAt.getTime() + planDuration[spec.plan] * 1000,
      );
      orders.push(
        nextOrder(spec.customer, spec.plan, "completed", spec.activatedAt, {
          allocation: {
            inventoryKey: spec.inventory,
            activatedAt: spec.activatedAt,
            expiresAt,
            status: "expired",
            endedAt: expiresAt,
          },
        }),
      );
    }

    orders.push(
      nextOrder(1, "proxy-7-days", "refunded", daysAgo(15), {
        failureReason: "OUT_OF_STOCK",
      }),
      nextOrder(2, "proxy-7-days", "refunded", daysAgo(20), {
        failureReason: "OUT_OF_STOCK",
      }),
    );

    // Historical completed orders give the admin analytics real spread.
    const historicalSpecs: Array<{
      customer: number;
      plan: PlanKey;
      inventory: string;
      activatedAt: Date;
    }> = [];
    const historyAges = [40, 45, 50, 38, 52, 42, 48];
    const midAges = [90, 85, 95, 82, 88, 92, 86];
    const recentOldAges = [110, 120, 115, 118, 112, 122, 108];
    const olderAges = [150, 145, 160, 155, 138, 168, 132];
    const plansForHistory: PlanKey[] = [
      "proxy-30-days",
      "proxy-7-days",
      "proxy-24-hours",
      "proxy-30-days",
    ];

    for (let i = 0; i < 7; i += 1) {
      const customerN = i + 2;
      historicalSpecs.push({
        customer: customerN,
        plan: plansForHistory[i % plansForHistory.length],
        inventory: "i6",
        activatedAt: daysAgo(historyAges[i]),
      });
      historicalSpecs.push({
        customer: customerN,
        plan: "proxy-7-days",
        inventory: "i10",
        activatedAt: daysAgo(midAges[i]),
      });
      historicalSpecs.push({
        customer: customerN,
        plan: plansForHistory[(i + 1) % plansForHistory.length],
        inventory: "i11",
        activatedAt: daysAgo(recentOldAges[i]),
      });
      historicalSpecs.push({
        customer: customerN,
        plan: "proxy-7-days",
        inventory: "i9",
        activatedAt: daysAgo(olderAges[i]),
      });
    }

    for (const spec of historicalSpecs) {
      const expiresAt = new Date(
        spec.activatedAt.getTime() + planDuration[spec.plan] * 1000,
      );
      orders.push(
        nextOrder(spec.customer, spec.plan, "completed", spec.activatedAt, {
          allocation: {
            inventoryKey: spec.inventory,
            activatedAt: spec.activatedAt,
            expiresAt,
            status: "expired",
            endedAt: expiresAt,
          },
        }),
      );
    }

    const productIds = new Map<string, string>();
    const productRows = await tx.query<{ id: string; slug: string }>(
      `select id, slug from products`,
    );
    for (const row of productRows.rows) productIds.set(row.slug, row.id);

    for (const order of orders) {
      const customer = customers.find((c) => c.n === order.customerN)!;
      await tx.query(
        `insert into orders
           (id, order_number, user_id, product_id, amount_minor, currency, status,
            failure_reason, idempotency_key, metadata, created_at, completed_at)
         values ($1,$2,$3,$4,$5,'NGN',$6,$7,$8,$9::jsonb,$10,$10)`,
        [
          order.id,
          order.orderNumber,
          customer.id,
          productIds.get(order.plan)!,
          order.amountMinor,
          order.status,
          order.failureReason ?? null,
          `seed-${order.id}`,
          JSON.stringify({ demo: true }),
          order.createdAt,
        ],
      );

      if (order.allocation) {
        await tx.query(
          `insert into proxy_allocations
             (id, user_id, proxy_inventory_id, order_id, product_id, status,
              activated_at, expires_at, ended_at, interruption_reason, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$7)`,
          [
            randomUUID(),
            customer.id,
            inventoryByKey[order.allocation.inventoryKey].id,
            order.id,
            productIds.get(order.plan)!,
            order.allocation.status,
            order.allocation.activatedAt,
            order.allocation.expiresAt,
            order.allocation.endedAt ?? null,
            order.allocation.status === "expired" ? "PACKAGE_EXPIRED" : null,
          ],
        );
      }
    }

    // ------------------------------------------------------------
    // Wallet funding, computed so ledger balances reconcile exactly
    // ------------------------------------------------------------
    type DepositSeed = {
      id: string;
      customerN: number;
      amountMinor: number;
      createdAt: Date;
      reference: string;
    };

    const netSpend = new Map<number, number>();
    for (const customer of customers) netSpend.set(customer.n, 0);
    for (const order of orders) {
      netSpend.set(
        order.customerN,
        (netSpend.get(order.customerN) ?? 0) +
          (order.status === "refunded" ? 0 : order.amountMinor),
      );
    }

    const secondaryDeposits: Array<{
      customerN: number;
      amountMinor: number;
      createdAt: Date;
    }> = [
      { customerN: 2, amountMinor: 2_000_000, createdAt: daysAgo(15) },
      { customerN: 3, amountMinor: 1_000_000, createdAt: daysAgo(18) },
      { customerN: 5, amountMinor: 500_000, createdAt: daysAgo(8) },
    ];

    const deposits: DepositSeed[] = [];
    let depositSequence = 0;
    function addDeposit(customerN: number, amountMinor: number, createdAt: Date) {
      depositSequence += 1;
      deposits.push({
        id: randomUUID(),
        customerN,
        amountMinor,
        createdAt,
        reference: `DEMO-DEP-${String(depositSequence).padStart(4, "0")}`,
      });
    }

    // Main demo account intentionally mirrors the reference wallet balance.
    addDeposit(1, 20_000_000, daysAgo(120));
    addDeposit(1, 6_000_000, daysAgo(12));

    for (const customer of customers.filter((c) => c.n !== 1)) {
      const secondary = secondaryDeposits
        .filter((d) => d.customerN === customer.n)
        .reduce((total, d) => total + d.amountMinor, 0);
      const initial =
        customer.targetBalanceMinor +
        (netSpend.get(customer.n) ?? 0) -
        secondary;
      if (initial <= 0) {
        throw new Error(`Demo seed deposit underflow for customer ${customer.n}`);
      }
      addDeposit(customer.n, initial, daysAgo(200));
      for (const extra of secondaryDeposits.filter(
        (d) => d.customerN === customer.n,
      )) {
        addDeposit(customer.n, extra.amountMinor, extra.createdAt);
      }
    }

    const walletRows = await tx.query<{ id: string; userId: string }>(
      `select id, user_id as "userId" from wallet_accounts`,
    );
    const walletByUser = new Map(
      walletRows.rows.map((row) => [row.userId, row.id]),
    );

    for (const deposit of deposits) {
      const customer = customers.find((c) => c.n === deposit.customerN)!;
      await tx.query(
        `insert into deposits
           (id, user_id, provider, provider_reference, amount_minor, currency,
            status, gateway_fee_minor, channel, metadata, verified_at, credited_at,
            created_at, updated_at)
         values ($1,$2,'demo',$3,$4,'NGN','credited',0,'demo',$5::jsonb,$6,$6,$6,$6)`,
        [
          deposit.id,
          customer.id,
          deposit.reference,
          deposit.amountMinor,
          JSON.stringify({ demo: true }),
          deposit.createdAt,
        ],
      );
    }

    type LedgerSeed = {
      customerN: number;
      entryType:
        | "deposit_credit"
        | "purchase_debit"
        | "refund_credit";
      amountMinor: number;
      createdAt: Date;
      reference: string;
      description: string;
      orderId?: string;
      depositId?: string;
    };

    const ledgerEntries: LedgerSeed[] = [];
    for (const deposit of deposits) {
      ledgerEntries.push({
        customerN: deposit.customerN,
        entryType: "deposit_credit",
        amountMinor: deposit.amountMinor,
        createdAt: deposit.createdAt,
        reference: `deposit:${deposit.id}`,
        description: "Demo wallet top-up",
        depositId: deposit.id,
      });
    }
    for (const order of orders) {
      ledgerEntries.push({
        customerN: order.customerN,
        entryType: "purchase_debit",
        amountMinor: -order.amountMinor,
        createdAt: order.createdAt,
        reference: `order:${order.id}:debit`,
        description: `${productName[order.plan]} purchase`,
        orderId: order.id,
      });
      if (order.status === "refunded") {
        ledgerEntries.push({
          customerN: order.customerN,
          entryType: "refund_credit",
          amountMinor: order.amountMinor,
          createdAt: new Date(order.createdAt.getTime() + 1000),
          reference: `order:${order.id}:refund`,
          description: "Refunded to BUYBIZ balance. No proxy was available.",
          orderId: order.id,
        });
      }
    }

    ledgerEntries.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const balances = new Map<number, number>();
    for (const customer of customers) balances.set(customer.n, 0);
    const finalBalances = new Map<number, number>();

    for (const entry of ledgerEntries) {
      const customer = customers.find((c) => c.n === entry.customerN)!;
      const nextBalance = (balances.get(entry.customerN) ?? 0) + entry.amountMinor;
      if (nextBalance < 0) {
        throw new Error(`Demo ledger would go negative for ${customer.username}`);
      }
      balances.set(entry.customerN, nextBalance);
      finalBalances.set(entry.customerN, nextBalance);
      await tx.query(
        `insert into wallet_ledger
           (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
            currency, reference, related_order_id, related_deposit_id, description, created_at)
         values ($1,$2,$3,$4,$5,'NGN',$6,$7,$8,$9,$10)`,
        [
          walletByUser.get(customer.id)!,
          customer.id,
          entry.entryType,
          entry.amountMinor,
          nextBalance,
          entry.reference,
          entry.orderId ?? null,
          entry.depositId ?? null,
          entry.description,
          entry.createdAt,
        ],
      );
    }

    for (const customer of customers) {
      if ((finalBalances.get(customer.n) ?? 0) !== customer.targetBalanceMinor) {
        throw new Error(
          `Demo wallet reconciliation failed for ${customer.username}: ${finalBalances.get(customer.n)} !== ${customer.targetBalanceMinor}`,
        );
      }
    }

    // ------------------------------------------------------------
    // Support tickets
    // ------------------------------------------------------------
    const mainTicketId = randomUUID();
    const zainabTicketId = randomUUID();
    await tx.query(
      `insert into support_tickets
         (id, ticket_number, user_id, subject, category, priority, status,
          last_message_at, created_at, updated_at)
       values
         ($1,'TKT-1001',$2,'Proxy connection drops on macOS','technical','high','open',$3,$4,$3),
         ($5,'TKT-1002',$6,'Deposit not showing in wallet','deposit','normal','resolved',$7,$8,$7)`,
      [
        mainTicketId,
        customers[0].id,
        hoursAgo(6),
        daysAgo(1),
        zainabTicketId,
        customers[1].id,
        daysAgo(2),
        daysAgo(3),
      ],
    );
    await tx.query(
      `insert into support_messages (ticket_id, author_user_id, is_staff, body, created_at)
       values
         ($1,$2,false,$3,$4),
         ($1,$5,true,$6,$7),
         ($1,$2,false,$8,$9)`,
      [
        mainTicketId,
        customers[0].id,
        "Hi team, my SOCKS5 connection keeps disconnecting every few minutes on macOS. I have tried both the terminal and my browser. My access is still showing as active.",
        daysAgo(1),
        SUPPORT_ID,
        "Thanks for the details, Ademola. We have checked the upstream proxy and it is responding. Please try the connection again and share the exact client error if it persists. Your BUYBIZ access period is still active.",
        hoursAgo(20),
        "Still dropping after switching clients. The error says 'connection reset by peer'. Is there anything you can check on the shared upstream?",
        hoursAgo(6),
      ],
    );
    await tx.query(
      `insert into support_messages (ticket_id, author_user_id, is_staff, body, created_at)
       values
         ($1,$2,false,$3,$4),
         ($1,$5,true,$6,$7)`,
      [
        zainabTicketId,
        customers[1].id,
        "I paid ₦20,000 but my wallet still shows the old balance. The Paystack page said successful.",
        daysAgo(3),
        SUPPORT_ID,
        "We verified the payment against Paystack and the wallet credit is now confirmed. This ticket is resolved. Please reopen it if anything still looks wrong.",
        daysAgo(2),
      ],
    );

    // ------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------
    const [main, zainab] = customers;
    await tx.query(
      `insert into notifications (user_id, type, title, body, href, read_at, created_at)
       values
         ($1,'deposit','Wallet funded','Your demo wallet top-up of ₦60,000.00 was credited.','/dashboard/wallet',$2,$3),
         ($1,'allocation','Proxy activated','Your 30-day proxy is active. Connection details are ready in My Proxies.','/dashboard/proxies',null,$4),
         ($1,'refund','Refund credited to your wallet','We could not allocate a proxy for order BZ-DEMO-0027, so ₦1,000.00 was returned to your BUYBIZ balance.','/dashboard/orders',$5,$6),
         ($1,'support','Support replied to your ticket','A BUYBIZ support agent replied to “Proxy connection drops on macOS”.','/dashboard/support',null,$7),
         ($1,'allocation','Your 7-day proxy expires soon','Check your connection details and expiry in My Proxies.','/dashboard/proxies',null,$8),
         ($1,'system','Welcome to BUYBIZ','Your wallet is ready. Add funds and choose a proxy plan to get started.','/dashboard/marketplace',$9,$10),
         ($11,'deposit','Wallet funded','Your demo wallet top-up was credited to your BUYBIZ wallet.','/dashboard/wallet',$12,$13),
         ($11,'support','Ticket resolved','Your support ticket “Deposit not showing in wallet” was marked resolved.','/dashboard/support',$14,$15)`,
      [
        main.id,
        daysAgo(11),
        daysAgo(12),
        daysAgo(1),
        daysAgo(14),
        daysAgo(15),
        hoursAgo(20),
        hoursAgo(3),
        daysAgo(120),
        daysAgo(120),
        zainab.id,
        daysAgo(2),
        daysAgo(2),
        daysAgo(2),
        daysAgo(2),
      ],
    );

    // ------------------------------------------------------------
    // Expenses
    // ------------------------------------------------------------
    await tx.query(
      `insert into expenses
         (description, category, amount_minor, currency, expense_date, proxy_inventory_id,
          notes, created_by, created_at, updated_at)
       values
         ('Proxy acquisition: U.S. residential pool','proxy_purchase',12000000,'NGN',current_date - 45,$1,'Demo operating expense',$2,$3,$3),
         ('Proxy acquisition: UK mobile pool','proxy_purchase',8500000,'NGN',current_date - 18,$4,'Demo operating expense',$2,$5,$5),
         ('Render web service','infrastructure',1850000,'NGN',current_date - 30,null,'Demo hosting expense',$2,$6,$6),
         ('Domain registration','infrastructure',1200000,'NGN',current_date - 60,null,'Demo domain expense',$2,$7,$7),
         ('Support tooling','software',900000,'NGN',current_date - 20,null,'Demo software expense',$2,$8,$8)`,
      [
        inventoryByKey.i2.id,
        ADMIN_ID,
        daysAgo(45),
        inventoryByKey.i3.id,
        daysAgo(18),
        daysAgo(30),
        daysAgo(60),
        daysAgo(20),
      ],
    );

    // ------------------------------------------------------------
    // Append-only audit trail
    // ------------------------------------------------------------
    const mainOrder = orders.find(
      (order) => order.customerN === 1 && order.status === "refunded",
    )!;
    await tx.query(
      `insert into audit_logs
         (actor_user_id, actor_role, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
       values
         ($1,'super_admin','inventory.created','proxy_inventory',$2,$3::jsonb,'203.0.113.5','BUYBIZ demo seed',$4),
         ($1,'super_admin','product.price_updated','product',$5,$6::jsonb,'203.0.113.5','BUYBIZ demo seed',$7),
         ($1,'super_admin','inventory.credential_revealed','proxy_inventory',$2,$8::jsonb,'203.0.113.5','BUYBIZ demo seed',$9),
         (null,'system','order.refunded','order',$10,$11::jsonb,null,null,$12),
         ($1,'super_admin','expense.created','expense',null,$13::jsonb,'203.0.113.5','BUYBIZ demo seed',$14)`,
      [
        ADMIN_ID,
        inventoryByKey.i1.id,
        JSON.stringify({ label: "Lagos Datacenter 01", seats: 10 }),
        daysAgo(45),
        productIds.get("proxy-30-days")!,
        JSON.stringify({ from: 250000, to: 300000 }),
        daysAgo(30),
        JSON.stringify({ reason: "admin credential reveal", fields: ["username"] }),
        daysAgo(6),
        mainOrder.id,
        JSON.stringify({ reason: "OUT_OF_STOCK", amount: 100000 }),
        daysAgo(15),
        JSON.stringify({ description: "Proxy acquisition: U.S. residential pool" }),
        daysAgo(45),
      ],
    );

    // Recompute inventory status from live allocations. Never trusts a counter.
    await tx.query(`select reconcile_proxy_status()`);

    await tx.query(
      `insert into app_settings (key, value, description)
       values ('demo_seed_version', '"1"'::jsonb, 'Local demo dataset version. Demo data only.')
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
    );
  });
}

export const demoAccountDetails = {
  customer: { email: "demo@buybiz.test", password: CUSTOMER_PASSWORD, username: "ademola" },
  admin: { email: "admin@buybiz.test", password: ADMIN_PASSWORD, username: "buybizadmin" },
  support: { email: "support@buybiz.test", password: SUPPORT_PASSWORD, username: "support" },
};

export type DemoSeedTransaction = SqlTransaction;
