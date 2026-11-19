"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronRight, Copy, ExternalLink, Eye, EyeOff, LayoutList, Loader2, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";

const BSC_RPC = "https://bsc-dataseed.binance.org/";
const USDT = "0x55d398326f99059ff775485246999027b3197955";
const BSC_EXPLORER = "https://bscscan.com/tx/";
type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type View = "home" | "receive" | "send" | "activity";

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const r = await fetch(BSC_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = (await r.json()) as { result?: T; error?: { message?: string } };
  if (j.error || j.result === undefined) throw new Error(j.error?.message ?? "RPC unavailable");
  return j.result;
}
async function readBalances(address: string) {
  const data = `0x70a08231${address.replace(/^0x/, "").padStart(64, "0")}`;
  const [usdt, bnb] = await Promise.all([rpc<string>("eth_call", [{ to: USDT, data }, "latest"]), rpc<string>("eth_getBalance", [address, "latest"])]);
  return { usdt: Number(BigInt(usdt)) / 1e18, bnb: Number(BigInt(bnb)) / 1e18 };
}
function short(address: string | null) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "No wallet"; }
function validAddress(value: string) { return /^0x[0-9a-fA-F]{40}$/.test(value.trim()); }

export function Web3WalletPanel() {
  const [view, setView] = useState<View>("home");
  const [mode, setMode] = useState<"welcome" | "wallet" | "create">("welcome");
  const [address, setAddress] = useState<string | null>(null);
  const [walletKind, setWalletKind] = useState<"connected" | "created" | null>(null);
  const [balances, setBalances] = useState<{ usdt: number; bnb: number } | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [wordCheck, setWordCheck] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(target = address) {
    if (!target) return;
    setBusy(true); setError(null);
    try { setBalances(await readBalances(target)); } catch (e) { setError(e instanceof Error ? e.message : "Could not refresh balance."); } finally { setBusy(false); }
  }
  function provider() {
    const w = window as unknown as {
      okxwallet?: EthereumProvider & { ethereum?: EthereumProvider };
      ethereum?: EthereumProvider;
    };
    const okx = w.okxwallet;
    return okx?.ethereum ?? (typeof okx?.request === "function" ? okx : null) ?? w.ethereum ?? null;
  }
  async function waitForProvider() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const p = provider();
      if (p) return p;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    return null;
  }
  function providerErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message);
    return "Wallet connection failed.";
  }
  async function connect() {
    setBusy(true); setError(null);
    try {
      const p = await waitForProvider();
      if (!p) { setError("OKX Wallet was not detected. Unlock the OKX extension and refresh this page."); return; }
      const accounts = await p.request({ method: "eth_requestAccounts" }) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error("OKX did not return a wallet account. Unlock the wallet and try again.");
      try { await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }); } catch { setError("Switch OKX Wallet to BNB Smart Chain (BSC), then press Connect again."); }
      setAddress(account); setWalletKind("connected"); setMode("wallet"); void refresh(account);
    } catch (e) { setError(providerErrorMessage(e)); } finally { setBusy(false); }
  }
  function create() {
    setError(null);
    try {
      const phrase = generateMnemonic(english);
      const account = mnemonicToAccount(phrase, { addressIndex: 0 });
      setMnemonic(phrase); setAddress(account.address); setWalletKind("created"); setConfirmed(false); setWordCheck(""); setMode("create"); void refresh(account.address);
    } catch { setError("Could not create a wallet in this browser."); }
  }
  function verifyBackup() {
    if (!mnemonic) return;
    const words = mnemonic.split(" ");
    if (wordCheck.trim().toLowerCase().replace(/\s+/g, " ") !== [words[2], words[6], words[10]].join(" ").toLowerCase()) {
      setError("Words do not match. Confirm words 3, 7 and 11 exactly."); return;
    }
    setConfirmed(true); setMnemonic(null); setWordCheck(""); setError(null); setMode("wallet");
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); } catch { /* noop */ } }
  async function sendUsdt(event: React.FormEvent) {
    event.preventDefault();
    if (walletKind !== "connected" || !address) { setError("The created wallet is local-only. Import its recovery phrase into OKX Wallet to sign transfers."); return; }
    if (!validAddress(recipient)) { setError("Enter a valid BEP20 recipient address."); return; }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > (balances?.usdt ?? 0)) { setError("Enter a valid amount within your available USDT balance."); return; }
    const p = provider();
    if (!p) { setError("Wallet provider is unavailable."); return; }
    setBusy(true); setError(null);
    try {
      const units = BigInt(Math.round(value * 1e18)).toString(16).padStart(64, "0");
      const data = `0xa9059cbb${recipient.replace(/^0x/, "").padStart(64, "0")}${units}`;
      const hash = await p.request({ method: "eth_sendTransaction", params: [{ from: address, to: USDT, data, value: "0x0" }] }) as string;
      setTxHash(hash); setView("activity"); setRecipient(""); setAmount(""); void refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The wallet rejected or failed the transaction."); } finally { setBusy(false); }
  }

  if (mode === "welcome") {
    return (
      <div className="space-y-4">
        <div className="rounded-[12px] bg-[#0A0B0D] p-4 text-white">
          <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white text-[#0A0B0D]"><Wallet className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold">BUYBIZ Treasury Wallet</p><p className="text-[8px] text-white/45">USDT · BNB Smart Chain · BEP20</p></div></div>
          <p className="mt-4 text-[10px] leading-5 text-white/55">Connect the OKX Wallet you already control, or create a self-custody wallet locally on this device.</p>
        </div>
        {error ? <p className="rounded-[8px] border border-warning/20 bg-warning-soft p-2 text-[9px] text-warning">{error}</p> : null}
        <button type="button" onClick={() => void connect()} disabled={busy} className="flex w-full items-center gap-3 rounded-[11px] border border-border bg-white p-3 text-left transition hover:border-foreground/30 disabled:opacity-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#0A0B0D] text-white">OK</span>
          <span className="min-w-0 flex-1"><span className="block text-[10.5px] font-semibold">Connect existing OKX Wallet</span><span className="mt-0.5 block text-[8.5px] text-muted-foreground">Browser extension · you sign in OKX</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button type="button" onClick={create} className="flex w-full items-center gap-3 rounded-[11px] border border-border bg-white p-3 text-left transition hover:border-foreground/30">
          <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-surface-subtle"><ShieldCheck className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[10.5px] font-semibold">Create a new self-custody wallet</span><span className="mt-0.5 block text-[8.5px] text-muted-foreground">12 words · generated locally · never uploaded</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="rounded-[9px] border border-border bg-white p-3"><p className="text-[8.5px] font-semibold">Treasury controls</p><div className="mt-2 space-y-1.5 text-[8px] text-muted-foreground"><p>• Public address only. No seed phrase or private key enters BUYBIZ.</p><p>• Network: BNB Smart Chain · Asset: USDT BEP20.</p><p>• Sending requires your wallet&apos;s own signature.</p></div></div>
        <p className="text-[8px] leading-4 text-muted-foreground">BUYBIZ never asks for an existing wallet&apos;s seed phrase or private key. This panel shows live BSC data only when a public address is available.</p>
      </div>
    );
  }

  const usdValue = (balances?.usdt ?? 0); // USDT is treated as 1 USD; no external price feed is invented.

  return (
    <div className="space-y-3">
      <div className="rounded-[13px] bg-[#0A0B0D] p-4 text-white">
        <div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-medium uppercase tracking-[0.14em] text-white/40">Treasury balance</p><div className="mt-1 flex items-baseline gap-2"><p className="tabular text-[27px] font-semibold tracking-[-0.05em]">{hideBalance ? "••••" : `${(balances?.usdt ?? 0).toFixed(2)}`}</p><span className="text-[10px] text-white/45">USDT</span></div><p className="mt-1 text-[8.5px] text-white/40">{hideBalance ? "Hidden" : `≈ $${usdValue.toFixed(2)} USD`} · BNB Smart Chain</p></div><div className="flex gap-1"><button type="button" onClick={() => setHideBalance((v) => !v)} aria-label={hideBalance ? "Show balance" : "Hide balance"} className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10">{hideBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => void refresh()} disabled={busy} aria-label="Refresh balance" className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</button></div></div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5"><span className="inline-flex items-center gap-1.5 text-[8.5px] text-white/50"><span className="h-1.5 w-1.5 rounded-full bg-[#B9FF66]" /> {walletKind === "created" ? "Local wallet" : "OKX Wallet"} · BSC</span><span className="font-mono text-[8.5px] text-white/55">{short(address)}</span></div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setView("receive")} className="flex flex-col items-center gap-1.5 rounded-[9px] border border-border bg-white py-2.5 text-[8.5px] font-medium hover:bg-surface-subtle"><ArrowDownLeft className="h-3.5 w-3.5" /> Receive</button>
        <button type="button" onClick={() => setView("send")} className="flex flex-col items-center gap-1.5 rounded-[9px] border border-border bg-white py-2.5 text-[8.5px] font-medium hover:bg-surface-subtle"><ArrowUpRight className="h-3.5 w-3.5" /> Send</button>
        <button type="button" onClick={() => setView("activity")} className="flex flex-col items-center gap-1.5 rounded-[9px] border border-border bg-white py-2.5 text-[8.5px] font-medium hover:bg-surface-subtle"><LayoutList className="h-3.5 w-3.5" /> Activity</button>
      </div>

      {view === "receive" ? <div className="rounded-[10px] border border-border bg-white p-3"><p className="text-[10px] font-semibold">Receive USDT BEP20</p><p className="mt-1 text-[8.5px] leading-4 text-muted-foreground">Only send USDT on BNB Smart Chain (BEP20) to this address. Other networks may cause permanent loss.</p><p className="mt-2 break-all rounded-[7px] bg-surface-subtle p-2 font-mono text-[8.5px]">{address}</p><button type="button" onClick={() => address && void copy(address)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-[8.5px]"><Copy className="h-3 w-3" /> Copy address</button></div> : null}
      {view === "send" ? <form onSubmit={sendUsdt} className="rounded-[10px] border border-border bg-white p-3"><p className="text-[10px] font-semibold">Send USDT BEP20</p>{walletKind === "created" ? <p className="mt-1 rounded-[6px] bg-warning-soft p-2 text-[8px] leading-4 text-warning">This wallet was created locally. Import its recovery phrase into OKX Wallet to sign transfers here.</p> : <><input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient 0x address" className="mt-2 h-8 w-full rounded border border-border px-2 font-mono text-[9px]" /><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount USDT" className="mt-1.5 h-8 w-full rounded border border-border px-2 text-[9px]" /><div className="mt-1.5 flex justify-between text-[8px] text-muted-foreground"><span>Available {balances?.usdt.toFixed(2) ?? "—"} USDT</span><span>Network BEP20</span></div><button type="submit" disabled={busy} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0A0B0D] px-3 text-[8.5px] font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />} Review in wallet</button></>}{txHash ? <p className="mt-2 break-all text-[8px] text-success">Submitted: {txHash}</p> : null}</form> : null}
      {view === "activity" ? <div className="rounded-[10px] border border-border bg-white p-3"><p className="text-[10px] font-semibold">Activity</p>{txHash ? <a href={`${BSC_EXPLORER}${txHash}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-between rounded-[7px] bg-surface-subtle p-2 text-[8.5px]"><span>BEP20 transfer submitted</span><ExternalLink className="h-3 w-3" /></a> : <p className="mt-2 text-[8.5px] text-muted-foreground">No transactions submitted from this panel yet. Full on-chain history is not fabricated.</p>}</div> : null}

      <div className="rounded-[10px] border border-border bg-white p-3"><div className="flex items-center justify-between"><p className="text-[9px] font-semibold">Assets</p><span className="text-[7.5px] text-muted-foreground">BEP20 only</span></div><div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[9px]"><span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#26A17B] text-[7px] font-bold text-white">₮</span> USDT <span className="text-[7.5px] text-muted-foreground">BEP20</span></span><span className="tabular">{hideBalance ? "••••" : (balances?.usdt ?? 0).toFixed(4)}</span></div><div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[9px]"><span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3BA2F] text-[7px] font-bold text-white">B</span> BNB <span className="text-[7.5px] text-muted-foreground">gas</span></span><span className="tabular">{hideBalance ? "••••" : (balances?.bnb ?? 0).toFixed(4)}</span></div></div>
      <button type="button" onClick={() => { setMode("welcome"); setAddress(null); setBalances(null); setWalletKind(null); setMnemonic(null); setView("home"); }} className="h-8 w-full rounded-full text-[8px] text-muted-foreground underline">Disconnect wallet</button>

      {mode === "create" && mnemonic ? <div className="rounded-[10px] border border-warning/30 bg-warning-soft p-3"><p className="text-[9px] font-semibold text-warning">Back up these 12 words offline</p><p className="mt-1 text-[8px] leading-4 text-warning">Never send them to BUYBIZ, the AI, support, or anyone else. They are shown only in this browser session.</p><div className="mt-2 grid grid-cols-3 gap-1">{mnemonic.split(" ").map((word, i) => <span key={i} className="rounded bg-white/70 px-1 py-1 font-mono text-[7.5px]">{i + 1}. {word}</span>)}</div><p className="mt-2 text-[8px] text-warning">Confirm words 3, 7 and 11.</p><input value={wordCheck} onChange={(e) => setWordCheck(e.target.value)} placeholder="word3 word7 word11" className="mt-1 h-8 w-full rounded border border-warning/30 bg-white/70 px-2 text-[8.5px]" /><button type="button" onClick={verifyBackup} className="mt-1 h-8 rounded-full bg-[#0A0B0D] px-2 text-[8px] font-semibold text-white">Confirm backup</button></div> : null}
      {confirmed ? <p className="flex items-start gap-1 text-[8px] leading-4 text-success"><Check className="mt-0.5 h-3 w-3 shrink-0" /> Backup confirmed. Import the phrase into OKX using the standard EVM path m/44&apos;/60&apos;/0&apos;/0/0. BUYBIZ does not retain the phrase.</p> : null}
    </div>
  );
}
