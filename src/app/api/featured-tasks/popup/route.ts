import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){const db=await getDb();const r=await db.query<{slug:string;title:string;reward:number;endsAt:Date;hasBanner:boolean}>(`select slug,title,reward_usd_cents reward,ends_at as "endsAt",(banner_data is not null) as "hasBanner" from featured_tasks where status='active' and started_at is not null and submissions_enabled=true and starts_at<=now() and ends_at>now() order by started_at desc limit 1`);if(!r.rows[0])return NextResponse.json({task:null});return NextResponse.json({task:r.rows[0]},{headers:{"Cache-Control":"no-store"}});}
