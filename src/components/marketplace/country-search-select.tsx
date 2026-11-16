"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import { countryFlag } from "@/lib/ai/countries";
import { cn } from "@/lib/utils";

export type CountryChoice = {
  code: string;
  name: string;
  configured: boolean;
  available: number;
};

function availability(country: CountryChoice) {
  if (!country.configured) return { label: "Country Not Available", tone: "text-muted-foreground" };
  if (country.available > 0) return { label: "Available", tone: "text-success" };
  return { label: "Out of Stock", tone: "text-warning" };
}

export function CountrySearchSelect({
  countries,
  selectedCode,
  basePath,
  extraQuery = {},
}: {
  countries: CountryChoice[];
  selectedCode: string | null;
  basePath: string;
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = countries.find((country) => country.code === selectedCode);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((country) =>
      `${country.name} ${country.code}`.toLowerCase().includes(term),
    );
  }, [countries, query]);

  function choose(code: string | null) {
    const params = new URLSearchParams(extraQuery);
    if (code) params.set("country", code);
    else params.delete("country");
    const suffix = params.toString();
    router.push(`${basePath}${suffix ? `?${suffix}` : ""}`);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative w-full sm:max-w-[390px]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-11 w-full items-center gap-2 rounded-full border border-border bg-surface px-4 text-left text-[11.5px] font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-[16px]">{selected ? countryFlag(selected.code) : "🌍"}</span>
        <span className="min-w-0 flex-1 truncate">{selected ? selected.name : "All countries"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-[14px] border border-border bg-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country"
                aria-label="Search country"
                className="h-9 w-full rounded-full border border-border bg-surface-subtle pl-9 pr-3 text-[11px] outline-none focus:border-border-strong"
              />
            </div>
          </div>
          <div className="max-h-[290px] overflow-y-auto p-1.5" role="listbox">
            {!query.trim() ? (
              <button type="button" onClick={() => choose(null)} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[11px] hover:bg-accent">
                <span className="text-[15px]">🌍</span><span className="flex-1">All countries</span>
                {!selectedCode ? <Check className="h-3.5 w-3.5 text-success" /> : null}
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-center text-[10.5px] text-muted-foreground">No country matches “{query}”.</p>
            ) : filtered.map((country) => {
              const status = availability(country);
              return (
                <button
                  key={country.code}
                  type="button"
                  role="option"
                  aria-selected={selectedCode === country.code}
                  onClick={() => choose(country.code)}
                  className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left hover:bg-accent"
                >
                  <span className="text-[15px]">{countryFlag(country.code)}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{country.name}</span>
                  <span className={cn("shrink-0 text-[9px] font-medium", status.tone)}>{status.label}</span>
                  {selectedCode === country.code ? <Check className="h-3.5 w-3.5 text-success" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
