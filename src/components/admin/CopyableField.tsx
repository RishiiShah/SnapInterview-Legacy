"use client";

import { useState } from "react";

export function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#A8B0C2]">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <p className="min-w-0 flex-1 break-all font-mono text-xs text-[#C5CBD8]">{value}</p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="shrink-0 cursor-pointer rounded-md border border-white/[0.1] px-2 py-1 text-xs font-medium text-[#A8B0C2] transition-colors hover:bg-white/[0.05] hover:text-[#F2F4F8]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
