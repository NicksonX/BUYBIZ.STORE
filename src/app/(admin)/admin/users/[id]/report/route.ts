import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireAdmin } from "@/server/auth/guards";
import { getUserReportData } from "@/server/services/user-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function ngn(minor:number){return `NGN ${(Number(minor)/100).toLocaleString("en-NG",{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function dt(value:Date|string|null|undefined){return value?new Intl.DateTimeFormat("en-NG",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Lagos"}).format(new Date(value)):"-";}
export async function GET(_request: Request, { params }: { params: Promise<{ id:string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({message:"Unauthorized"},{status:401}); }
  const { id } = await params;
  const data = await getUserReportData(id);
  if (!data) return NextResponse.json({message:"User not found"},{status:404});
  const doc = new PDFDocument({ size:"A4", margin:42, bufferPages:true, info:{Title:`BUYBIZ User Report - ${data.profile.username}`,Author:"BUYBIZ"} });
  const chunks:Buffer[]=[]; doc.on("data",(c:Buffer)=>chunks.push(c));
  const done = new Promise<Buffer>((resolve)=>doc.on("end",()=>resolve(Buffer.concat(chunks))));
  const width=515; let y=42;
  const heading=(text:string)=>{ if(y>720){doc.addPage();y=42;} doc.font("Helvetica-Bold").fontSize(15).fillColor("#0A0B0D").text(text,42,y,{width}); y+=24; };
  const line=(text:string,size=9,bold=false)=>{ if(y>760){doc.addPage();y=42;} doc.font(bold?"Helvetica-Bold":"Helvetica").fontSize(size).fillColor("#33343A").text(text,42,y,{width}); y+=size+5; };
  const table=(headers:string[],rows:string[][])=>{ const widths=headers.map((_,i)=>i===0?130:width/(headers.length-1)); const drawRow=(cells:string[],head=false)=>{ if(y>740){doc.addPage();y=42;} let x=42; const h=head?16:Math.max(14,Math.ceil(Math.max(...cells.map((c,i)=>doc.widthOfString(c,{width:widths[i]-4})/11))*14)); doc.font(head?"Helvetica-Bold":"Helvetica").fontSize(7.5).fillColor(head?"#0A0B0D":"#444"); cells.forEach((cell,i)=>{doc.text(cell,x+3,y+4,{width:widths[i]-6});x+=widths[i];}); if(head){doc.rect(42,y,width,h).fill("#F0F0F2"); doc.fillColor("#0A0B0D"); let xx=42; cells.forEach((cell,i)=>{doc.font("Helvetica-Bold").fontSize(7.5).text(cell,xx+3,y+4,{width:widths[i]-6});xx+=widths[i];});} y+=h; doc.moveTo(42,y).lineTo(557,y).strokeColor("#E5E5E7").stroke(); };
    drawRow(headers,true); rows.forEach(r=>drawRow(r)); y+=8; };
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#0A0B0D").text("BUYBIZ",42,42); doc.font("Helvetica").fontSize(10).fillColor("#6E7178").text("Complete user transaction & service report",42,72); y=105;
  line(`Report generated: ${dt(new Date())}`,8); line(`User ID: ${data.profile.id}`,8);
  heading("User profile"); table(["Field","Detail"],[["Username",data.profile.username],["Name",data.profile.displayName??"-"],["Email",data.profile.email],["Status",data.profile.status],["Role",data.profile.role],["Email verified",data.profile.emailVerified?"Yes":"No"],["Joined",dt(data.profile.createdAt)],["Last activity",dt(data.profile.lastActivityAt)]]);
  const totals=data.ledger.reduce((a,r)=>{const t=r.entryType; a[t]=(a[t]??0)+Number(r.amountMinor); return a;},{deposit_credit:0,purchase_debit:0,refund_credit:0,admin_credit:0,admin_debit:0,reversal:0} as Record<string,number>);
  const balance=data.ledger[0]?.balanceAfterMinor??0;
  heading("Financial summary"); table(["Metric","Amount"],[["Current balance",ngn(balance)],["Deposits credited",ngn(totals.deposit_credit)],["Purchases/fees debited",ngn(Math.abs(totals.purchase_debit))],["Refunds credited",ngn(totals.refund_credit)],["Admin credits",ngn(totals.admin_credit)],["Admin debits",ngn(Math.abs(totals.admin_debit))]]);
  heading("Wallet transaction history"); table(["Date","Type","Amount","Balance","Reference"],[...data.ledger].reverse().map(r=>[dt(r.createdAt),r.entryType,ngn(r.amountMinor),ngn(r.balanceAfterMinor),`${r.reference}${r.orderNumber?` / ${r.orderNumber}`:""}`]));
  heading("Deposits"); table(["Date","Amount","Status","Provider ref"],[...data.deposits].reverse().map(r=>[dt(r.createdAt),ngn(r.amountMinor),r.status,r.providerReference??"-"]));
  heading("Orders and service delivery"); table(["Date","Order","Plan","Amount","Order status","Allocation"],[...data.orders].reverse().map(r=>[dt(r.createdAt),r.orderNumber,r.productName,ngn(r.amountMinor),r.status,r.allocationStatus??"Not provisioned"]));
  heading("Proxy allocations"); table(["Activated","Expires","Plan","Endpoint","Region","Status"],[...data.allocations].reverse().map(r=>[dt(r.activatedAt),dt(r.expiresAt),r.productName,`${r.host}:${r.port}`,r.region??"-",r.status]));
  heading("Proxy switches and terminations"); table(["Date","Event","Detail","Amount"],[...data.switches.map(r=>[dt(r.switchedAt),"Switch",`${r.fromHost} to ${r.toHost}`,ngn(40000)]),...data.terminations.map(r=>[dt(r.terminatedAt),"Termination",`${r.productName} / ${r.host}`,ngn(r.feeMinor)])].sort((a,b)=>String(b[0]).localeCompare(String(a[0]))));
  heading("Referral history"); table(["Date","Referee","Status","Reward"],[...data.referrals].reverse().map(r=>[dt(r.createdAt),r.referee,r.status,ngn(r.rewardAmountMinor??0)]));
  heading("Campaign and giveaway rewards"); table(["Date","Type","Name","Role/Status","Reward"],[...data.campaigns.map(r=>[dt(r.createdAt),"Campaign",r.campaignName,`${r.role} / ${r.status}`,`$${(r.amountMinor/100).toFixed(2)} USDT`]),...data.giveaways.map(r=>[dt(r.claimedAt),"Giveaway",r.title,r.winner?`Winner / ${r.status}`:`Participant / ${r.status}`,`$${(r.amountMinor/100).toFixed(2)} USDT`])]);
  heading("Featured task rewards"); table(["Date","Task","Status","Risk","Wallet"],[...data.taskSubmissions].reverse().map(r=>[dt(r.createdAt),r.title,r.status,r.riskLevel,r.wallet]));
  heading("Support and audit activity"); table(["Date","Type","Detail"],[...data.tickets.map(r=>[dt(r.createdAt),"Ticket",`${r.ticketNumber} / ${r.subject} / ${r.status}`]),...data.audit.map(r=>[dt(r.createdAt),"Audit",`${r.action} / ${r.entityType} / ${r.entityId??"-"}`]),...data.notifications.map(r=>[dt(r.createdAt),"Notification",`${r.type} / ${r.title}`])].sort((a,b)=>String(b[0]).localeCompare(String(a[0]))));
  const range=doc.bufferedPageRange(); for(let i=0;i<range.count;i++){doc.switchToPage(range.start+i); doc.font("Helvetica").fontSize(7).fillColor("#8C9097").text(`BUYBIZ confidential user report · Page ${i+1} of ${range.count}`,42,806,{width:515,align:"center"});}
  doc.end(); const buffer=await done;
  return new NextResponse(new Uint8Array(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="buybiz-user-${data.profile.username.replace(/[^a-zA-Z0-9_-]/g,"_")}.pdf"`,"Cache-Control":"private, no-store"}});
}
