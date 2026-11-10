"use client";

import { Check, Copy, FlaskConical } from "lucide-react";
import { useState } from "react";

const accounts = [
  {
    label: "Customer",
    email: "demo@buybiz.test",
    password: "Demo1234!",
    hint: "Ademola · wallet, proxies and orders",
  },
  {
    label: "Admin",
    email: "admin@buybiz.test",
    password: "Admin1234!",
    hint: "Full admin dashboard and inventory",
  },
];

export function DemoAccountFill() {
  const [filled, setFilled] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function fill(email: string, password: string, label: string) {
    const emailInput = document.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    const passwordInput = document.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
    setFilled(label);
    setCopied(null);
    emailInput?.focus();
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="mt-6 rounded-[12px] border border-black/[0.08] bg-white/70 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#0A0B0D] text-white">
          <FlaskConical className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold text-[#0A0B0D]">
            Demo access
          </p>
          <p className="text-[9px] text-[#0A0B0D]/40">
            Local demo database. No real money or production accounts.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {accounts.map((account) => (
          <div
            key={account.label}
            className="flex items-center justify-between gap-2 rounded-[8px] border border-black/[0.055] bg-[#F7F7F8] px-2.5 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-[#0A0B0D]">
                {account.email}
                <span className="ml-1.5 font-normal text-[#0A0B0D]/35">
                  · {account.password}
                </span>
              </p>
              <p className="truncate text-[8.5px] text-[#0A0B0D]/35">
                {account.hint}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => copy(`${account.email} / ${account.password}`, account.label)}
                className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-black/[0.07] bg-white text-[#0A0B0D]/45 hover:text-[#0A0B0D]"
                aria-label={`Copy ${account.label} demo credentials`}
              >
                {copied === account.label ? (
                  <Check className="h-3 w-3 text-[#16794A]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => fill(account.email, account.password, account.label)}
                className="inline-flex h-6 items-center rounded-[5px] bg-[#0A0B0D] px-2 text-[8.5px] font-medium text-white hover:bg-[#1A1C1F]"
              >
                {filled === account.label ? "Filled" : "Use"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
