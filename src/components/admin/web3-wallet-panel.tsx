"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";

const BSC_RPC = "https://bsc-dataseed.binance.org/";
const USDT = "0x55d398326f99059ff775485246999027b3197955";

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

async function rpcBalance(address: string) {
  const data = `0x70a08231${address.replace(/^0x/, "").padStart(64, "0")}`;
  const call = async (method: string, params: unknown[]) => {
    const r = await fetch(BSC_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const j = (await r.json()) as { result?: string; error?: { message?: string } };
    if (j.error || !j.result) throw new Error(j.error?.message ?? "RPC unavailable");
    return j.result;
  };
  const [usdt, bnb] = await Promise.all([call("eth_call", [{ to: USDT, data }, "latest"]), call("eth_getBalance", [address, "latest"])]);
  return { usdt: Number(BigInt(usdt)) / 1e18, bnb: Number(BigInt(bnb)) / 1e18 };
}

export function Web3WalletPanel() {
  const [mode, setMode] = useState<"idle" | "connect" | "create">("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [walletKind, setWalletKind] = useState<"connected" | "created" | null>(null);
  const [balances, setBalances] = useState<{ usdt: number; bnb: number } | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [wordCheck, setWordCheck] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(target = address) {
    if (!target) return;
    setBusy(true); setError(null);
    try { setBalances(await rpcBalance(target)); } catch (e) { setError(e instanceof Error ? e.message : "Could not refresh balance."); } finally { setBusy(false); }
  }

  async function connect() {
    setError(null);
    const injected = (window as unknown as { okxwallet?: { ethereum?: EthereumProvider }; ethereum?: EthereumProvider }).okxwallet?.ethereum ?? (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!injected) { setError("No OKX/EVM browser wallet found. Open this page in the OKX Wallet browser or install the extension."); return; }
    setBusy(true);
    try {
      const accounts = await injected.request({ method: "eth_requestAccounts" }) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error("No wallet account was returned.");
      try { await injected.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }); } catch { setError("Please switch your wallet to BNB Smart Chain (BSC)."); }
      setAddress(account); setWalletKind("connected"); setMode("connect"); await refresh(account);
    } catch (e) { setError(e instanceof Error ? e.message : "Wallet connection failed."); } finally { setBusy(false); }
  }

  function create() {
    setError(null);
    try {
      const phrase = generateMnemonic(english);
      const account = mnemonicToAccount(phrase, { addressIndex: 0 });
      setMnemonic(phrase); setAddress(account.address); setWalletKind("created"); setConfirmed(false); setWordCheck(""); setMode("create"); void refresh(account.address);
    } catch { setError("Could not create a wallet on this device."); }
  }

  function verifyBackup() {
    if (!mnemonic) return;
    const words = mnemonic.split(" ");
    const expected = [words[2], words[6], words[10]].join(" ").toLowerCase();
    if (wordCheck.trim().toLowerCase().replace(/\s+/g, " ") !== expected) {
      setError("Those recovery words do not match. Check words 3, 7 and 11 exactly.");
      return;
    }
    setConfirmed(true); setMnemonic(null); setWordCheck(""); setError(null);
  }

  async function copy(value: string) { try { await navigator.clipboard.writeText(value); } catch { /* ignore */ } }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0A0B0D] text-white"><Wallet className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold">BUYBIZ Web3 Wallet</p><p className="text-[8px] text-muted-foreground">USDT · BNB Smart Chain (BEP20)</p></div></div><span className="rounded-full border border-border px-2 py-1 text-[7.5px] uppercase tracking-[0.08em] text-muted-foreground">{walletKind ?? "not connected"}</span></div>
      {error ? <p className="rounded-[7px] border border-warning/20 bg-warning-soft px-2 py-1.5 text-[8.5px] text-warning">{error}</p> : null}
      {!address ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => void connect()} disabled={busy} className="h-9 rounded-full bg-foreground text-[9px] font-semibold text-background disabled:opacity-45">{busy ? "Connecting…" : "Connect Existing"}</button><button type="button" onClick={create} className="h-9 rounded-full border border-border text-[9px] font-medium">Create New</button></div> : null}
      {address ? <div className="space-y-2"><p className="break-all rounded-[7px] border border-border bg-surface-subtle px-2 py-1.5 font-mono text-[8.5px]">{address}</p><div className="grid grid-cols-2 gap-2"><div className="rounded-[8px] border border-border p-2"><p className="text-[7.5px] uppercase text-muted-foreground">USDT BEP20</p><p className="mt-1 text-[16px] font-semibold">{balances ? balances.usdt.toFixed(4) : "—"}</p></div><div className="rounded-[8px] border border-border p-2"><p className="text-[7.5px] uppercase text-muted-foreground">BNB gas</p><p className="mt-1 text-[16px] font-semibold">{balances ? balances.bnb.toFixed(4) : "—"}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copy(address)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-[8.5px]"><Copy className="h-3 w-3" /> Copy address</button><button type="button" onClick={() => void refresh()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-[8.5px]">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh</button><button type="button" onClick={() => { setAddress(null); setBalances(null); setWalletKind(null); setMode("idle"); setMnemonic(null); }} className="h-8 rounded-full px-2 text-[8.5px] text-muted-foreground underline">Disconnect</button></div></div> : null}
      {mode === "create" && mnemonic ? <div className="rounded-[8px] border border-warning/30 bg-warning-soft p-2"><p className="text-[8.5px] font-semibold text-warning">Write these 12 words down offline. Never send them to anyone. BUYBIZ will not store them.</p><div className="mt-2 grid grid-cols-3 gap-1">{mnemonic.split(" ").map((word, i) => <span key={i} className="rounded bg-white/60 px-1 py-1 font-mono text-[8px]">{i + 1}. {word}</span>)}</div><button type="button" onClick={() => void copy(mnemonic)} className="mt-2 h-7 rounded-full border border-warning/30 px-2 text-[8px]">Copy phrase</button><p className="mt-2 text-[8px] text-warning">Confirm words 3, 7 and 11 to finish. The phrase is cleared from this panel after confirmation.</p><input value={wordCheck} onChange={(e) => setWordCheck(e.target.value)} placeholder="word3 word7 word11" className="mt-1 h-8 w-full rounded border border-warning/30 bg-white/70 px-2 text-[9px]" aria-label="Confirm recovery words" /><button type="button" onClick={verifyBackup} className="mt-1 h-8 rounded-full bg-foreground px-2 text-[8.5px] font-semibold text-background">Confirm backup</button></div> : null}
      {confirmed ? <p className="flex items-center gap-1 text-[8px] text-success"><ShieldCheck className="h-3 w-3" /> Backup verified. Import the 12 words into OKX Wallet using the standard EVM path m/44&apos;/60&apos;/0&apos;/0/0. Test with a small transfer first. The phrase was not sent to BUYBIZ.</p> : null}
      <p className="text-[7.5px] leading-3 text-muted-foreground">Creating a wallet happens locally in your browser. BUYBIZ never receives the recovery phrase or private key. Sending funds must be signed in your wallet; this panel is read-only for balances.</p>
    </div>
  );
}
