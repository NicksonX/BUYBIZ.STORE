"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Globe2, Loader2, Save, Sparkles } from "lucide-react";
import { countryFlag, PRIMARY_COUNTRIES } from "@/lib/ai/countries";
import { parseAndVerifyProxiesAction, saveVerifiedProxiesAction, type ProxyPreviewRow } from "@/server/actions/proxy-ai";
import { cn } from "@/lib/utils";

type Country = { code: string; name: string };
type Batch = { id: string; countryCode: string; total: number; verified: number; saved: number; createdAt: string; status: string };

export function ProxyAiWorkspace({
  countries,
  products,
  batches,
}: {
  countries: Country[];
  products: Array<{ slug: string; name: string; accessType: string }>;
  batches: Batch[];
}) {
  const [countryCode, setCountryCode] = useState("US");
  const [raw, setRaw] = useState("");
  const [protocol, setProtocol] = useState<"http" | "https" | "socks4" | "socks5">("socks5");
  const [productSlug, setProductSlug] = useState(products[0]?.slug ?? "proxy-7-days");
  const [accessType, setAccessType] = useState<"shared" | "single">("shared");
  const [expiryDays, setExpiryDays] = useState(30);
  const [maxSeats, setMaxSeats] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProxyPreviewRow[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; parsed: number; verified: number; failed: number; mismatched: number; unverified: number; duplicates: number } | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const primary = useMemo(
    () => PRIMARY_COUNTRIES.map((code) => countries.find((item) => item.code === code)).filter(Boolean) as Country[],
    [countries],
  );
  const others = useMemo(() => countries.filter((item) => !PRIMARY_COUNTRIES.includes(item.code as "US")), [countries]);
  const filtered = rows.filter((row) => {
    if (filter === "verified") return row.status === "verified";
    if (filter === "failed") return row.status === "failed";
    if (filter === "mismatch") return row.status === "review_required";
    if (filter === "unverified") return row.status === "country_unverified";
    if (filter === "duplicate") return row.duplicate;
    return true;
  });

  async function parse() {
    setLoading(true);
    setError(null);
    setSavedMessage(null);
    try {
      const result = await parseAndVerifyProxiesAction({ countryCode, protocol, raw, productSlug, accessType, expiryDays, maxSeats });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRows(result.rows);
      setBatchId(result.batchId);
      setSummary(result.summary);
    } catch {
      setError("The proxy list could not be processed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!batchId) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveVerifiedProxiesAction(batchId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSavedMessage(`${result.saved} verified prox${result.saved === 1 ? "y" : "ies"} saved to inventory.${result.skipped ? ` ${result.skipped} duplicate/invalid entries skipped.` : ""}`);
      setBatchId(null);
      setRows([]);
    } catch {
      setError("The verified proxies could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-[15px] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-foreground text-background"><Sparkles className="h-4 w-4" /></span>
          <div><h2 className="text-[13px] font-semibold">Import proxies</h2><p className="text-[9.5px] text-muted-foreground">Select the expected country, paste the list, then verify before saving.</p></div>
        </div>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">1. Expected country</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {primary.map((country) => (
            <button key={country.code} type="button" onClick={() => setCountryCode(country.code)} className={cn("flex items-center gap-2 rounded-[10px] border px-3 py-3 text-left text-[11px] font-medium", countryCode === country.code ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-border-strong")}>
              <span className="text-[18px]">{countryFlag(country.code)}</span>{country.name}
            </button>
          ))}
        </div>
        <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="mt-2 h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-[11px] sm:max-w-[320px]" aria-label="More countries">
          {others.map((country) => <option key={country.code} value={country.code}>{countryFlag(country.code)} {country.name}</option>)}
        </select>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">2. Paste proxy list</p>
        <h3 className="mt-1 text-[16px] font-semibold">Paste Your Proxy List</h3>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Paste your proxy credentials below. We extract the connection details, verify the proxies and organise them into inventory.</p>
        <textarea value={raw} onChange={(event) => setRaw(event.target.value)} rows={8} placeholder={"host:port:username:password\nusername:password@host:port\nhost:port"} className="mt-2 w-full rounded-[10px] border border-border bg-surface-subtle p-3 font-mono text-[10.5px] leading-5 outline-none focus:border-foreground/30" />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
          <button type="button" onClick={() => setRaw("")} className="rounded-full border border-border px-3 py-1.5">Clear</button>
          <span className="text-muted-foreground">{raw.split(/\r?\n/).filter((line) => line.trim()).length} lines</span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          <label className="text-[9.5px] text-muted-foreground">Protocol<select value={protocol} onChange={(event) => setProtocol(event.target.value as typeof protocol)} className="mt-1 h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-[10.5px] text-foreground"><option value="socks5">SOCKS5</option><option value="socks4">SOCKS4</option><option value="http">HTTP</option><option value="https">HTTPS</option></select></label>
          <label className="text-[9.5px] text-muted-foreground">Plan<select value={productSlug} onChange={(event) => setProductSlug(event.target.value)} className="mt-1 h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-[10.5px] text-foreground">{products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}</select></label>
          <label className="text-[9.5px] text-muted-foreground">Access<select value={accessType} onChange={(event) => { const next = event.target.value as "shared" | "single"; setAccessType(next); setMaxSeats(next === "single" ? 1 : 10); }} className="mt-1 h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-[10.5px] text-foreground"><option value="shared">Shared</option><option value="single">Single customer</option></select></label>
          <label className="text-[9.5px] text-muted-foreground">Expiry (days)<input type="number" min={1} max={365} value={expiryDays} onChange={(event) => setExpiryDays(Number(event.target.value))} className="mt-1 h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-[10.5px] text-foreground" /></label>
          <label className="text-[9.5px] text-muted-foreground">Max seats<input type="number" min={1} max={100} value={accessType === "single" ? 1 : maxSeats} disabled={accessType === "single"} onChange={(event) => setMaxSeats(Number(event.target.value))} className="mt-1 h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-[10.5px] text-foreground disabled:opacity-50" /></label>
        </div>

        <button type="button" onClick={() => void parse()} disabled={loading || raw.trim().length < 6} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[11px] font-semibold text-background disabled:opacity-45">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />} {loading ? "Parsing and verifying…" : "Parse & verify proxies"}
        </button>
        {error ? <p className="mt-2 rounded-[8px] border border-danger/20 bg-danger-soft px-3 py-2 text-[10px] text-danger">{error}</p> : null}
        {savedMessage ? <p className="mt-2 rounded-[8px] border border-success/20 bg-success-soft px-3 py-2 text-[10px] text-success">{savedMessage}</p> : null}
      </section>

      {summary ? (
        <section className="surface-card rounded-[15px] p-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[["Total", summary.total], ["Parsed", summary.parsed], ["Verified", summary.verified], ["Failed", summary.failed], ["Mismatch", summary.mismatched], ["Unverified", summary.unverified], ["Duplicates", summary.duplicates]].map(([label, value]) => (
              <div key={String(label)} className="rounded-[9px] border border-border bg-surface-subtle p-2.5"><p className="text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="tabular mt-1 text-[17px] font-semibold">{value}</p></div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {[["all", "All"], ["verified", "Verified"], ["failed", "Failed"], ["mismatch", "Country mismatch"], ["unverified", "Could not verify"], ["duplicate", "Duplicates"]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setFilter(key)} className={cn("rounded-full border px-2.5 py-1 text-[9.5px]", filter === key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>{label}</button>
              ))}
            </div>
            <button type="button" onClick={() => void save()} disabled={saving || !batchId || summary.verified === 0} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background disabled:opacity-40">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save verified proxies to inventory
            </button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-[9px] border border-border">
            <table className="w-full min-w-[820px] text-left text-[9.5px]">
              <thead className="bg-surface-subtle text-[8px] uppercase tracking-[0.08em] text-muted-foreground"><tr>{["Host", "Port", "Username", "Password", "Expected", "Detected", "Protocol", "Latency", "Status"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={`${row.fingerprint}-${row.lineNumber}`}>
                    <td className="px-3 py-2 font-mono">{row.host}</td><td className="px-3 py-2">{row.port || "—"}</td><td className="px-3 py-2">{row.username || "—"}</td><td className="px-3 py-2 font-mono text-muted-foreground">{row.passwordMasked || "—"}</td><td className="px-3 py-2">{countryFlag(row.expectedCountryCode)} {row.expectedCountryName}</td><td className="px-3 py-2">{row.countryCode ? `${countryFlag(row.countryCode)} ${row.countryName}` : "Could not verify"}</td><td className="px-3 py-2 uppercase">{row.protocol}</td><td className="px-3 py-2">{row.latencyMs ? `${row.latencyMs} ms` : "—"}</td><td className="px-3 py-2"><span className={cn("inline-flex items-center gap-1", row.status === "verified" ? "text-success" : row.status === "failed" ? "text-danger" : "text-warning")}>{row.status === "verified" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{row.status === "review_required" ? "Country mismatch" : row.status === "country_unverified" ? "Country could not be verified" : row.status === "failed" ? "Verification failed" : row.status === "verified" ? "Verified: country matches" : row.status.replace("_", " ")}</span>{row.duplicate ? <p className="mt-0.5 text-[8px] text-warning">Duplicate</p> : null}{row.error ? <p className="mt-0.5 max-w-[180px] text-[8px] text-muted-foreground">{row.error}</p> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="surface-card rounded-[15px] p-4">
        <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-muted-foreground" /><h2 className="text-[12px] font-semibold">Import history</h2></div>
        {batches.length === 0 ? <p className="mt-2 text-[10px] text-muted-foreground">No imports yet.</p> : (
          <div className="mt-3 divide-y divide-border">{batches.map((batch) => <div key={batch.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[9.5px]"><span>{countryFlag(batch.countryCode)} {batch.countryCode} · {batch.createdAt}</span><span className="text-muted-foreground">{batch.total} parsed · {batch.verified} verified · {batch.saved} saved</span><span className="uppercase text-muted-foreground">{batch.status}</span></div>)}</div>
        )}
      </section>
    </div>
  );
}
