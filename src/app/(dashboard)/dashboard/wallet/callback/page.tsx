import { redirect } from "next/navigation";
import { requireUserPage } from "@/server/auth/guards";
import { verifyAndCreditDeposit } from "@/server/services/deposits";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function paymentState(status: string) {
  if (status === "credited") return "success";
  if (["failed", "abandoned", "reversed"].includes(status)) return "failed";
  return "pending";
}

export default async function WalletCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const reference = first(params.reference) || first(params.trxref);

  if (!reference) redirect("/dashboard/wallet");

  let state = "pending";
  try {
    const result = await verifyAndCreditDeposit({
      reference,
      userId: user.id,
      actorUserId: user.id,
    });
    state = paymentState(result.status);
  } catch (error) {
    // The dedicated status page will retry the server verification and show
    // a safe failure or pending state. A redirect never marks a payment paid.
    console.error(
      "[buybiz/wallet/callback] verification error",
      (error as Error).message,
    );
  }

  redirect(
    `/dashboard/wallet/payment/${state}?reference=${encodeURIComponent(reference)}`,
  );
}
