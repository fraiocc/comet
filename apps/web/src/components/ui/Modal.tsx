"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "lg",
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    size === "xl" ? "max-w-5xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`animate-modal-in flex w-full ${widthClass} max-h-[92vh] flex-col overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[0_32px_96px_rgba(0,0,0,0.78)] ring-1 ring-inset ring-white/[0.07] sm:max-h-[88vh] sm:rounded-[28px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5 sm:gap-6 sm:px-9 sm:pb-5 sm:pt-8">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-xl font-semibold tracking-tight text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--muted)] transition-colors duration-150 hover:bg-rose-500/15 hover:text-[#fda4af] active:scale-95 cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mx-5 h-px shrink-0 bg-white/[0.05] sm:mx-9" />

        <div className="overflow-y-auto px-5 py-5 sm:px-9 sm:py-7">{children}</div>
      </div>
    </div>
  );
}
