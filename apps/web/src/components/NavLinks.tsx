"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface NavLinksProps {
  items: NavItem[];
}

export function NavLinks({ items }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-8 md:flex">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[15px] font-medium transition-colors duration-150 ${
              active ? "text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
