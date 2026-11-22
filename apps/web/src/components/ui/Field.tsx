import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_BASE =
  "w-full rounded-2xl bg-[var(--surface-2)] px-4.5 py-4 text-base text-[var(--text)] placeholder:text-[var(--subtle)] ring-1 ring-inset ring-white/[0.05] outline-none transition-all duration-150 focus:bg-[var(--surface-hover)] focus:ring-2 focus:ring-[#9cc4ff]/40";

export function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2.5 block text-sm font-medium text-[var(--muted)]">
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={[FIELD_BASE, className ?? ""].join(" ")} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={[FIELD_BASE, "resize-none", className ?? ""].join(" ")} {...props} />
  );
}
