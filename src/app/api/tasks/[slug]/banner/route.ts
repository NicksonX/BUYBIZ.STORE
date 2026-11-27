import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(_r:Request,{params}:{params:Promise<{slug:string}>}){const {slug}=await params;const db=await getDb();const r=await db.query<{data:string;mime:string}>(`select encode(banner_data,'base64') data,coalesce(banner_mime,'image/png') mime from featured_tasks where slug=$1 and banner_data is not null and status='published'`,[slug]);if(!r.rows[0])return new NextResponse(null,{status:404});return new NextResponse(Buffer.from(r.rows[0].data,"base64"),{headers:{"Content-Type":r.rows[0].mime,"Cache-Control":"public, max-age=300"}});}
