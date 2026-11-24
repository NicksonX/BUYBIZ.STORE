import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { runProxyHealthChecks } from "@/server/services/proxy-health";
export const dynamic = "force-dynamic"; export const maxDuration = 300;
function authorized(request: Request) { const secret=process.env.CRON_SECRET; if(secret) return request.headers.get("authorization")===`Bearer ${secret}`||request.headers.get("x-cron-secret")===secret; return isDemoMode()&&process.env.NODE_ENV!=="production"; }
export async function GET(request: Request) { if(!authorized(request)) return NextResponse.json({ok:false},{status:401}); try { const result=await runProxyHealthChecks(); return NextResponse.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}}); } catch(error){ console.error("[buybiz/cron] proxy health failed",error); return NextResponse.json({ok:false},{status:500}); } }
