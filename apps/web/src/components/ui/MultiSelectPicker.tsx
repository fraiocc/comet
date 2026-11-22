"use client";

import { useState } from "react";

import { CheckIcon } from "@/components/ui/Icons";

interface MultiSelectPickerProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  maxHeightClass?: string;
  formatLabel?: (value: string) => string;
  emptyLabel?: string;
}

export function MultiSelectPicker({
  options,
  selected,
  onChange,
  searchable = false,
  searchPlaceholder = "Search...",
  maxHeightClass = "max-h-44",
  formatLabel,
  emptyLabel = "No options found",
}: MultiSelectPickerProps) {
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);

  function toggle(item: string) {
    if (selectedSet.has(item)) {
      onChange(selected.filter((v) => v !== item));
    } else {
      onChange([...selected, item]);
    }
  }

  const normalized = query.trim().toLowerCase();
  const filtered = options.filter((opt) => {
    if (!normalized) return true;
    const label = formatLabel ? formatLabel(opt) : opt;
    return opt.toLowerCase().includes(normalized) || label.toLowerCase().includes(normalized);
  });

  return (
    <div className="space-y-2.5 rounded-2xl bg-[var(--bg)]/60 p-3">
      {searchable && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] outline-none transition-colors focus:bg-[var(--surface-2)] focus:ring-2 focus:ring-[#9cc4ff]/35"
        />
      )}

      {filtered.length === 0 ? (
        <p className="py-5 text-center text-sm text-[var(--muted)]">{emptyLabel}</p>
      ) : (
        <div className={`flex flex-wrap gap-2 overflow-y-auto pr-1 ${maxHeightClass}`}>
          {filtered.map((item) => {
            const active = selectedSet.has(item);
            const label = formatLabel ? formatLabel(item) : item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-150 active:scale-[0.97] cursor-pointer ${
                  active
                    ? "bg-[#1a6dff] text-white"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-white"
                }`}
              >
                {active && <CheckIcon className="h-3.5 w-3.5" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
