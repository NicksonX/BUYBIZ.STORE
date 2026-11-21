"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { recordPaymentByHashAction } from "@/server/actions/treasury";

type Item = { id: string; username: string; walletAddress: string; amountCents: number; status: string; transactionHash: string | null };
type Ethereum = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const RPC = "https://bsc-dataseed.bnbchain.org";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function getProvider(): Ethereum | null {
  const w = window as unknown as { okxwallet?: { ethereum?: Ethereum } & Ethereum; ethereum?: Ethereum };
  return w.okxwallet?.ethereum ?? w.okxwallet ?? w.ethereum ?? null;
}
function transferData(address: string, amountCents: number) {
  const recipient = address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  const amount = (BigInt(amountCents) * BigInt(10) ** BigInt(16)).toString(16).padStart(64, "0");
  return `0xa9059cbb${recipient}${amount}`;
}
async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json() as { result?: unknown; error?: { message?: string } };
  if (j.error) throw new Error(j.error.message ?? "BSC RPC error");
  return j.result;
}
async function waitForReceipt(hash: string) {
  for (let i = 0; i < 60; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const receipt = await rpc("eth_getTransactionReceipt", [hash]) as { status?: string; logs?: Array<{ address: string; topics: string[]; data: string }> } | null;
    if (receipt) return receipt;
  }
  throw new Error("Transaction is still pending. Do not resend; check BSC before retrying.");
}

export function OkxPayoutSigner({ items, batchStatus }: { items: Item[]; batchStatus: string }) {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  async function connect() {
    setError(null);
    const provider = getProvider();
    if (!provider) return setError("OKX Wallet was not found in this browser. Install or unlock the OKX extension and reload.");
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const chainId = await provider.request({ method: "eth_chainId" }) as string;
      if (chainId !== "0x38") {
        try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }); }
        catch { await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x38", chainName: "BNB Smart Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: [RPC], blockExplorerUrls: ["https://bscscan.com"] }] }); }
      }
      setAccount(accounts[0] ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "OKX connection failed."); }
  }

  async function sign(item: Item) {
    if (busy) return;
    setError(null);
    const provider = getProvider();
    if (!provider || !account) return setError("Connect OKX Wallet first.");
    setBusy(item.id);
    setStatus((s) => ({ ...s, [item.id]: "waiting for OKX approval" }));
    try {
      const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from: account, to: USDT, value: "0x0", data: transferData(item.walletAddress, item.amountCents) }] }) as string;
      setSigned((s) => ({ ...s, [item.id]: hash }));
      setStatus((s) => ({ ...s, [item.id]: "confirming on BSC" }));
      await waitForReceipt(hash);
      const result = await recordPaymentByHashAction(item.id, hash);
      if (!result.ok) throw new Error(result.message);
      setStatus((s) => ({ ...s, [item.id]: "paid — verified on-chain" }));
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Transaction failed."); setStatus((s) => ({ ...s, [item.id]: "not paid" })); }
    finally { setBusy(null); }
  }

  if (batchStatus !== "approved" && batchStatus !== "processing") return <div className="rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] text-warning">Approve the batch first. Signing is disabled until approval.</div>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[9px] border border-border bg-surface-subtle p-3"><Wallet className="h-4 w-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-[9.5px] font-medium">{account ? `OKX Wallet connected` : "Connect OKX Wallet to pay winners"}</p><p className="mt-0.5 break-all font-mono text-[8px] text-muted-foreground">{account ?? "Each transfer requires your approval in OKX."}</p></div>{!account ? <button type="button" onClick={() => void connect()} className="inline-flex min-h-10 items-center rounded-full bg-foreground px-3 text-[9.5px] font-semibold text-background">Connect OKX</button> : <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[8px] text-success"><ShieldCheck className="h-3 w-3" /> BSC</span>}</div>
      {error ? <p className="rounded-[8px] border border-danger/20 bg-danger-soft px-3 py-2 text-[9px] text-danger">{error}</p> : null}
      <div className="space-y-2">{items.map((item) => { const hash = signed[item.id] ?? item.transactionHash; const state = status[item.id] ?? (item.status === "confirmed" ? "paid — verified on-chain" : item.status); return <div key={item.id} className="rounded-[8px] border border-border p-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[9.5px] font-medium">{item.username} · ${(item.amountCents / 100).toFixed(2)} USDT</p><p className="mt-0.5 break-all font-mono text-[8px] text-muted-foreground">{item.walletAddress}</p></div>{item.status === "confirmed" ? <span className="inline-flex items-center gap-1 text-[8.5px] text-success"><Check className="h-3 w-3" /> paid</span> : <button type="button" onClick={() => void sign(item)} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-foreground px-3 text-[8.5px] font-semibold text-background disabled:opacity-40">{busy === item.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Signing…</> : "Sign & send"}</button>}</div>{state ? <p className="mt-1 text-[8px] text-muted-foreground">{state}</p> : null}{hash ? <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[7.5px] text-success">View transaction <ExternalLink className="h-2.5 w-2.5" /></a> : null}</div>})}</div>
    </div>
  );
}
