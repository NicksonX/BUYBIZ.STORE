"use server";

import { requireUserPage } from "@/server/auth/guards";
import { getWalletTransactions, type WalletTransactionQuery } from "@/server/data/customer";

export async function loadWalletTransactions(input: WalletTransactionQuery) {
  const user = await requireUserPage();
  try {
    const page = await getWalletTransactions(user.id, {
      offset: Math.max(0, Number(input.offset ?? 0)),
      limit: Math.min(50, Math.max(1, Number(input.limit ?? 20))),
      filter: input.filter ?? "all",
      query: typeof input.query === "string" ? input.query : "",
    });
    return { ok: true as const, items: page.items, nextOffset: page.nextOffset, total: page.total };
  } catch (error) {
    console.error("[buybiz/wallet-history] load failed", error);
    return { ok: false as const, message: "Transactions could not be loaded." };
  }
}
