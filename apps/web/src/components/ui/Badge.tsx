import type { ReactNode } from "react";

type BadgeTone = "neutral" | "accent" | "success" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-2)] text-[var(--muted)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--muted)]",
  accent: "animate-pulse bg-[var(--accent)]",
  success: "animate-pulse bg-[var(--success)]",
  danger: "bg-[var(--danger)]",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${TONE_CLASSES[tone]}`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[tone]}`} />}
      {children}
    </span>
  );
}
