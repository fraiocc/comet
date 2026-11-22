"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon } from "@/components/ui/Icons";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

interface DropdownSelectProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  size?: "md" | "sm";
}

export function DropdownSelect<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const active = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={
          size === "sm"
            ? "flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-[var(--surface)] px-3.5 text-left text-sm text-white ring-1 ring-inset ring-white/[0.06] transition-colors duration-150 hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[#1a6dff]/40 cursor-pointer"
            : "flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-4.5 py-4 text-left text-base text-[var(--text)] transition-all duration-150 hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[#9cc4ff]/35 cursor-pointer"
        }
      >
        <span className="truncate font-medium">{active?.label}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className={`animate-modal-in absolute left-0 right-0 z-30 mt-1.5 overflow-hidden bg-[#181720] ring-1 ring-inset ring-white/[0.08] shadow-2xl shadow-black/60 ${
            size === "sm" ? "rounded-xl p-1.5" : "rounded-2xl p-2"
          }`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 text-left transition-colors duration-150 cursor-pointer ${
                  size === "sm" ? "rounded-lg px-3 py-2" : "rounded-xl px-4 py-3"
                } ${
                  isSelected
                    ? "bg-[#1a6dff]/20 text-white"
                    : "text-[var(--muted)] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-white">{option.label}</div>
                  {option.description && (
                    <div className="mt-0.5 text-xs text-[var(--muted)]">{option.description}</div>
                  )}
                </div>
                {isSelected && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#9cc4ff]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
