import "server-only";
import { getDb } from "@/lib/db";
import { decryptOptional } from "@/lib/security/encryption";
import { verifyProxy } from "@/server/services/proxy-verification";
import type { ParsedProxy } from "@/lib/ai/proxy-parser";
import { getAppSettings } from "@/server/data/settings";
import { queueEmail } from "@/server/services/email";
import { notifyUser } from "@/server/services/notifications";

function healthFrom(status: string): "healthy"|"degraded"|"offline" { return status === "verified" ? "healthy" : status === "review_required" ? "degraded" : "offline"; }
function diagnosis(batch: string, status: string, others: number) {
  if (status === "healthy") return `The proxy is responding normally on ${batch}.`;
  if (others > 1) return `Multiple proxies in ${batch} are failing. This may indicate a batch-wide upstream or credential issue rather than one bad proxy.`;
  return status === "degraded" ? `This single proxy in ${batch} returned an unexpected verification result. The rest of the batch should be checked before changing credentials.` : `This single proxy in ${batch} is not responding. Other proxies in the batch may still be healthy, so this looks isolated for now.`;
}
export async function runProxyHealthChecks() {
  const db = await getDb();
  const settings = await getAppSettings();
  const enabled = await db.query<{ value: boolean }>(`select value::boolean as value from app_settings where key='proxy_monitoring_enabled'`);
  if (enabled.rows[0] && enabled.rows[0].value === false) return { checked: 0, alerts: 0, recovered: 0, skipped: true };
  const thresholdSetting = await db.query<{ value: number }>(`select value::int as value from app_settings where key='proxy_failure_threshold'`);
  const threshold = Math.max(1, Number(thresholdSetting.rows[0]?.value ?? 2));
  const rows = await db.query<{ id:string;host:string;port:number;protocol:string;username:string|null;password:string|null;countryCode:string|null;group:string;lastSuccess:Date|null;failures:number }>(
    `select id,host,port,protocol::text as protocol,encrypted_username as username,encrypted_password as password,country_code as "countryCode",credential_group as "group",last_health_success_at as "lastSuccess",consecutive_failures as failures
       from proxy_inventory where archived_at is null and status in ('available','full') order by id`,
  );
  let alerts = 0; let recovered = 0; let checked = 0;
  for (const row of rows.rows) {
    const username = await decryptOptional(row.username); const password = await decryptOptional(row.password);
    const parsed: ParsedProxy = { lineNumber: 1, raw: "", host: row.host, port: row.port, username, password, protocol: row.protocol as ParsedProxy["protocol"], fingerprint: "", error: null };
    const result = await verifyProxy(parsed, (row.countryCode ?? "US").toUpperCase());
    checked += 1;
    const state = healthFrom(result.status);
    const failures = state === "healthy" ? 0 : row.failures + 1;
    await db.query(`update proxy_inventory set health_status=$2,consecutive_failures=$3,last_health_check_at=now(),last_health_success_at=case when $2='healthy' then now() else last_health_success_at end,last_health_error=$4 where id=$1`,[row.id,state,failures,state==="healthy"?null:result.error]);
    if (failures >= threshold && state !== "healthy") {
      const batchCounts = await db.query<{ others:number }>(`select count(*)::int as others from proxy_inventory where credential_group=$1 and health_status<>'healthy' and id<>$2 and archived_at is null`,[row.group,row.id]);
      const others = Number(batchCounts.rows[0]?.others ?? 0);
      const open = await db.query<{ id:string; firstDetectedAt:Date }>(`select id,first_detected_at as "firstDetectedAt" from proxy_health_incidents where inventory_id=$1 and status='open' order by first_detected_at desc limit 1`,[row.id]);
      const diagnosisText = diagnosis(row.group, state, others);
      if (!open.rows[0]) {
        const inc = await db.query<{ id:string }>(`insert into proxy_health_incidents (inventory_id,credential_group,incident_type,status,consecutive_failures,latency_ms,diagnostic) values ($1,$2,$3,'open',$4,$5,$6) returning id`,[row.id,row.group,state==="degraded"?"proxy_degraded":"proxy_offline",failures,result.latencyMs,diagnosisText]);
        const incidentId = inc.rows[0]?.id;
        if (incidentId) {
          const affected = await db.query<{ userId:string }>(`select distinct a.user_id as "userId" from proxy_allocations a where a.proxy_inventory_id=$1 and a.status='active' and a.expires_at>now()`, [row.id]);
          await db.transaction(async (tx) => {
            for (const user of affected.rows) {
              await tx.query(`insert into proxy_health_incident_users (incident_id,user_id) values ($1,$2) on conflict do nothing`, [incidentId,user.userId]);
              await notifyUser(tx, { userId:user.userId, type:"allocation", title:"Your Proxy Is Temporarily Affected ⚠️", body:"Your assigned proxy is currently experiencing an interruption due to ongoing maintenance or a connectivity issue. Our team is working to restore it as quickly as possible. Please bear with us for a few hours while we resolve the issue. We'll notify you as soon as your proxy is back online. Thank you for your patience and understanding.", href:"/dashboard/proxies" });
            }
          });
        }
        if (incidentId && settings.adminNotificationEmail) {
          const admin = await db.query<{id:string}>(`select id from profiles where role='super_admin' order by created_at limit 1`);
          if (admin.rows[0]) {
            const q = await db.transaction((tx)=>queueEmail(tx,{type:"proxy_health_alert",userId:admin.rows[0].id,recipient:settings.adminNotificationEmail,data:{proxyHost:row.host,proxyCountry:row.countryCode??"",batchName:row.group,healthStatus:state,firstDetectedLabel:new Date().toISOString(),lastSuccessfulLabel:row.lastSuccess?new Date(row.lastSuccess).toISOString():"Never",consecutiveFailures:failures,otherAffected:others,diagnostic:diagnosisText,adminActionUrl:`${process.env.NEXT_PUBLIC_APP_URL??"https://www.buybiz.store"}/admin/rotation`},dedupeKey:`proxy_health:${incidentId}:initial`}));
            if(q) alerts += 1;
          }
        }
      } else {
        await db.query(`update proxy_health_incidents set consecutive_failures=$2,latency_ms=$3,diagnostic=$4,last_failure_at=now(),updated_at=now() where id=$1`,[open.rows[0].id,failures,result.latencyMs,diagnosisText]);
      }
    } else if (state === "healthy") {
      const open = await db.query<{id:string}>(`select id from proxy_health_incidents where inventory_id=$1 and status='open' limit 1`,[row.id]);
      if (open.rows[0]) {
        await db.query(`update proxy_health_incidents set status='recovered',recovered_at=now(),resolved_at=now(),updated_at=now() where id=$1`,[open.rows[0].id]);
        const affected = await db.query<{ userId:string }>(`select user_id as "userId" from proxy_health_incident_users where incident_id=$1 and recovered_notified_at is null`, [open.rows[0].id]);
        await db.transaction(async (tx) => {
          for (const user of affected.rows) {
            await notifyUser(tx, { userId:user.userId, type:"allocation", title:"Your Proxy Is Back Online ✅", body:"Good news! Your proxy is back online and working again. You can resume using your service as normal. Thank you for your patience while we resolved the interruption.", href:"/dashboard/proxies" });
            await tx.query(`update proxy_health_incident_users set recovered_notified_at=now() where incident_id=$1 and user_id=$2`,[open.rows[0].id,user.userId]);
          }
        });
        if (settings.adminNotificationEmail) {
          const admin = await db.query<{id:string}>(`select id from profiles where role='super_admin' order by created_at limit 1`);
          if (admin.rows[0]) { const q=await db.transaction((tx)=>queueEmail(tx,{type:"proxy_health_alert",userId:admin.rows[0].id,recipient:settings.adminNotificationEmail,data:{proxyHost:row.host,proxyCountry:row.countryCode??"",batchName:row.group,healthStatus:"healthy",recovery:true,consecutiveFailures:0,otherAffected:0,diagnostic:`The proxy is healthy again on ${row.group}.`,adminActionUrl:`${process.env.NEXT_PUBLIC_APP_URL??"https://www.buybiz.store"}/admin/rotation`},dedupeKey:`proxy_health:${open.rows[0].id}:recovery`})); if(q) recovered += 1; }
        }
      }
    }
  }
  return { checked, alerts, recovered, skipped: false };
}
