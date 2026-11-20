import "server-only";
import type { SqlTransaction } from "@/lib/db/driver";
import {
  getEmailProviderName,
  getEmailRotationEnabled,
  getProviderApiKey,
  getProviderDailyLimit,
  getQuotaDate,
  isProviderEnabled,
  type EmailProvider,
} from "@/lib/email/config";

const PROVIDERS: EmailProvider[] = ["resend", "brevo"];

function otherProvider(provider: EmailProvider): EmailProvider {
  return provider === "resend" ? "brevo" : "resend";
}

async function eligible(tx: SqlTransaction, provider: EmailProvider) {
  if (!isProviderEnabled(provider) || !getProviderApiKey(provider)) return false;
  const limit = getProviderDailyLimit(provider);
  if (limit === null) return true;
  const usage = await tx.query<{ count: number }>(
    `select accepted_count as count from email_provider_usage
      where provider=$1 and usage_date=$2::date`,
    [provider, getQuotaDate()],
  );
  return Number(usage.rows[0]?.count ?? 0) < limit;
}

/**
 * Atomic provider decision. The rotation row is locked for the duration of the
 * decision, so concurrent workers cannot select the same provider slot twice.
 * Quotas are explicit environment limits; no provider quota is invented.
 */
export async function selectEmailProviders(
  tx: SqlTransaction,
  deliveryId: string,
): Promise<EmailProvider[]> {
  await tx.query(
    `insert into email_provider_rotation (id, next_provider)
     values (1, 'resend') on conflict (id) do nothing`,
  );
  const rotation = await tx.query<{ nextProvider: EmailProvider }>(
    `select next_provider as "nextProvider" from email_provider_rotation where id=1 for update`,
  );
  const pointer = rotation.rows[0]?.nextProvider ?? "resend";
  const settings = await tx.query<{ key: string; value: unknown }>(
    `select key, value from app_settings where key in ('email_primary_provider','email_rotation_enabled','email_brevo_enabled')`,
  );
  const settingMap = new Map(settings.rows.map((row) => [row.key, row.value]));
  const configuredPrimary = String(settingMap.get("email_primary_provider") ?? "").toLowerCase();
  const primary: EmailProvider = configuredPrimary === "brevo" || configuredPrimary === "resend"
    ? configuredPrimary
    : (getEmailProviderName() === "brevo" ? "brevo" : "resend");
  const dbRotation = settingMap.get("email_rotation_enabled");
  const rotationEnabled = dbRotation === false ? false : getEmailRotationEnabled();
  const selectedPrimary = rotationEnabled ? pointer : primary;
  // Brevo must stay disabled unless explicitly re-authorised in settings.
  const brevoAuthorized = settingMap.get("email_brevo_enabled") === true;
  const candidates: EmailProvider[] = [];
  if (selectedPrimary !== "brevo" || brevoAuthorized) {
    if (await eligible(tx, selectedPrimary)) candidates.push(selectedPrimary);
  }
  const secondary = otherProvider(selectedPrimary);
  if ((secondary !== "brevo" || brevoAuthorized) && await eligible(tx, secondary)) candidates.push(secondary);

  if (candidates.length > 0) {
    await tx.query(
      `update email_provider_rotation set next_provider=$1, updated_at=now() where id=1`,
      [otherProvider(selectedPrimary)],
    );
    await tx.query(
      `update email_deliveries
          set provider=$2, provider_status='selected', provider_selected_at=now(),
              updated_at=now()
        where id=$1`,
      [deliveryId, candidates[0]],
    );
  }
  return candidates;
}

export async function recordProviderAttempt(
  tx: SqlTransaction,
  input: {
    deliveryId: string;
    provider: EmailProvider;
    status: "accepted" | "rejected" | "uncertain" | "skipped";
    providerMessageId?: string | null;
    httpStatus?: number | null;
    errorCategory?: string | null;
    errorMessage?: string | null;
  },
) {
  const attempts = await tx.query<{ count: number }>(
    `select count(*)::int as count from email_provider_attempts where delivery_id=$1`,
    [input.deliveryId],
  );
  await tx.query(
    `insert into email_provider_attempts
       (delivery_id, attempt_number, provider, status, provider_message_id,
        http_status, error_category, error_message)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (delivery_id, attempt_number) do nothing`,
    [
      input.deliveryId,
      Number(attempts.rows[0]?.count ?? 0) + 1,
      input.provider,
      input.status,
      input.providerMessageId ?? null,
      input.httpStatus ?? null,
      input.errorCategory ?? null,
      (input.errorMessage ?? "").slice(0, 500) || null,
    ],
  );
  if (input.status === "accepted") {
    await tx.query(
      `insert into email_provider_usage (provider, usage_date, accepted_count)
       values ($1,$2::date,1)
       on conflict (provider, usage_date)
       do update set accepted_count = email_provider_usage.accepted_count + 1`,
      [input.provider, getQuotaDate()],
    );
  }
}

export async function quotaSnapshot(tx: SqlTransaction) {
  const date = getQuotaDate();
  const usage = await tx.query<{ provider: EmailProvider; count: number }>(
    `select provider, accepted_count as count from email_provider_usage where usage_date=$1::date`,
    [date],
  );
  const map = new Map(usage.rows.map((row) => [row.provider, Number(row.count)]));
  return {
    date,
    providers: PROVIDERS.map((provider) => ({
      provider,
      accepted: map.get(provider) ?? 0,
      limit: getProviderDailyLimit(provider),
      enabled: isProviderEnabled(provider),
      credentialPresent: Boolean(getProviderApiKey(provider)),
    })),
  };
}
