import type { HTMLAttributes } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "elevated";
  interactive?: boolean;
}

export function Surface({
  tone = "default",
  interactive = false,
  className,
  ...props
}: SurfaceProps) {
  const bg = tone === "elevated" ? "bg-[var(--surface-2)]" : "bg-[var(--surface)]";
  const hover = interactive
    ? "transition-colors duration-200 hover:bg-[#17161e] hover:ring-[#9cc4ff]/20"
    : "";

  return (
    <div
      className={[
        "rounded-3xl ring-1 ring-inset ring-white/[0.045]",
        bg,
        hover,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
