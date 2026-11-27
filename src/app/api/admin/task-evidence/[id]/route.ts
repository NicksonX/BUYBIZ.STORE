import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { getDb } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){try{await requireAdmin();}catch{return NextResponse.json({message:"Unauthorized"},{status:401});}const {id}=await params;const db=await getDb();const r=await db.query<{data:string;mime:string}>(`select encode(screenshot_data,'base64') data,screenshot_mime mime from featured_task_submissions where id=$1`,[id]);if(!r.rows[0])return NextResponse.json({message:"Not found"},{status:404});return new NextResponse(Buffer.from(r.rows[0].data,"base64"),{headers:{"Content-Type":r.rows[0].mime,"Cache-Control":"private, no-store"}});}
