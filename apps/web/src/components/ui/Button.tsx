import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[#1a6dff] text-white hover:bg-[#145ee6]",
  secondary: "bg-[#1a1922] text-[#e4e4ef] hover:bg-[#23222e] hover:text-white",
  ghost: "bg-transparent text-[var(--muted)] hover:bg-white/[0.06] hover:text-white",
  danger: "bg-transparent text-[#f87171]/85 hover:bg-rose-500/15 hover:text-[#fda4af]",
  dangerSolid: "bg-[#e13b56] text-white hover:bg-[#cc314a]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-4 py-2 text-xs rounded-full",
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-7 py-3.5 text-base rounded-full",
};

function buildClasses(variant: Variant, size: Size, className?: string): string {
  return [
    "inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6dff]/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={buildClasses(variant, size, className)} {...props} />;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  external?: boolean;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  external = false,
  className,
  ...props
}: LinkButtonProps) {
  const classes = buildClasses(variant, size, className);
  if (external) {
    return <a href={href} className={classes} {...props} />;
  }
  return <Link href={href} className={classes} {...props} />;
}
