interface FieldErrorProps {
  message?: string | null;
}

function AlertCircleIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="animate-fade-in mt-2 flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-[#fda4af] ring-1 ring-inset ring-rose-500/20"
    >
      <AlertCircleIcon />
      <span>{message}</span>
    </div>
  );
}

interface FormAlertProps {
  message?: string | null;
  variant?: "error" | "success";
  className?: string;
}

export function FormAlert({ message, variant = "error", className = "" }: FormAlertProps) {
  if (!message) return null;

  const tone =
    variant === "success"
      ? "bg-[var(--success-bg)] text-[var(--success)] ring-emerald-400/20"
      : "bg-rose-500/10 text-[#fda4af] ring-rose-500/20";

  return (
    <div
      role="alert"
      className={`animate-fade-in flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ring-1 ring-inset ${tone} ${className}`}
    >
      <AlertCircleIcon className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
