"use client";

import { useState } from "react";

import { CheckIcon } from "@/components/ui/Icons";

interface CopyFieldProps {
  value: string;
  copyLabel: string;
  copiedLabel: string;
}

export function CopyField({ value, copyLabel, copiedLabel }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--bg)]/75 py-1.5 pl-4 pr-1.5 ring-1 ring-inset ring-white/[0.06]">
      <code className="flex-1 truncate font-mono text-xs text-[var(--text)]/90">{value}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.1] hover:text-white cursor-pointer"
      >
        {copied && <CheckIcon className="h-3.5 w-3.5 text-[var(--success)]" />}
        <span>{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  );
}
