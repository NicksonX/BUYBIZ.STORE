import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getTreasuryWallet, readTreasuryBalance, getTreasuryOverview } from "@/server/services/treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  const [wallet, balance, overview] = await Promise.all([getTreasuryWallet(), readTreasuryBalance(), getTreasuryOverview()]);
  return NextResponse.json({
    wallet: wallet ? { label: wallet.label, address: wallet.address, enabled: wallet.enabled, network: wallet.network, asset: wallet.asset } : null,
    balance,
    batches: overview.batches.length,
  }, { headers: { "Cache-Control": "no-store" } });
}
