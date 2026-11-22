"use client";

import { useEffect, useState } from "react";

import { CheckIcon } from "@/components/ui/Icons";

interface TerminalPreviewProps {
  command: string;
  line1: string;
  line2: string;
  line3: string;
}

export function TerminalPreview({
  command,
  line1,
  line2,
  line3,
}: TerminalPreviewProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 1050),
      setTimeout(() => setStep(3), 1750),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleReplay() {
    setStep(0);
    setTimeout(() => setStep(1), 300);
    setTimeout(() => setStep(2), 900);
    setTimeout(() => setStep(3), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-[#0a0a10]/82 px-5 py-5 shadow-[0_32px_90px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl sm:rounded-3xl sm:px-9 sm:py-7">
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2.5 text-white">
          <span className="text-[#1a6dff]">&gt;</span>
          <span>{command}</span>
          {step === 0 && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-[#9cc4ff]" />
          )}
        </div>
        <button
          type="button"
          onClick={handleReplay}
          className="text-[11px] text-[var(--subtle)] transition-colors hover:text-white cursor-pointer"
        >
          Replay
        </button>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-4 font-mono text-[11px] sm:mt-5 sm:pt-5 sm:text-[13px]">
        <div
          className={`flex items-start gap-2.5 transition-all duration-300 ${
            step >= 1 ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
          }`}
        >
          <span className="shrink-0 text-[#8296ff]">&gt;</span>
          <span className="min-w-0 break-words text-white/90">{line1}</span>
        </div>

        <div
          className={`flex items-start gap-2.5 pl-3 transition-all duration-300 sm:pl-4 ${
            step >= 2 ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
          }`}
        >
          <span className="shrink-0 text-[var(--subtle)]">|</span>
          <span className="min-w-0 break-words text-[var(--muted)]">{line2}</span>
        </div>

        <div
          className={`flex items-start gap-2.5 pl-3 text-[var(--success)] transition-all duration-300 sm:items-center sm:pl-4 ${
            step >= 3 ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
          }`}
        >
          <span className="shrink-0 text-[var(--subtle)]">|</span>
          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
          <span className="min-w-0 break-words">{line3}</span>
        </div>
      </div>
    </div>
  );
}
