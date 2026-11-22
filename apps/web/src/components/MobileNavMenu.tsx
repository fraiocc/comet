"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CometLogo } from "@/components/ui/CometLogo";
import { ArrowRightIcon, DownloadIcon, LogOutIcon } from "@/components/ui/Icons";

interface NavItem {
  href: string;
  label: string;
}

interface MobileNavMenuProps {
  appName: string;
  items: NavItem[];
  username?: string | null;
  downloadLabel: string;
  signInLabel: string;
  signOutLabel: string;
}

export function MobileNavMenu({
  appName,
  items,
  username,
  downloadLabel,
  signInLabel,
  signOutLabel,
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors duration-200 hover:bg-white/[0.07] cursor-pointer"
      >
        <span
          className={`absolute h-[2px] w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
          }`}
        />
        <span
          className={`absolute h-[2px] w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
          }`}
        />
      </button>

      {mounted &&
        createPortal(
          <div
            aria-hidden={!open}
            className={`fixed inset-0 z-[100] flex flex-col justify-between bg-[#09090c]/96 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
              open
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          >
            <div>
              <div className="px-3 pt-3">
                <div className="flex h-14 items-center justify-between rounded-2xl bg-[#111117]/80 pl-4 pr-2.5 ring-1 ring-inset ring-white/[0.08]">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-white"
                  >
                    <CometLogo size={28} />
                    <span>{appName}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close navigation menu"
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors duration-200 hover:bg-white/[0.07] cursor-pointer"
                  >
                    <span
                      className={`absolute h-[2px] w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        open ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
                      }`}
                    />
                    <span
                      className={`absolute h-[2px] w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        open ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div
                className={`px-6 pt-8 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
                }`}
              >
                {username && (
                  <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#12121a] px-4 py-3 ring-1 ring-inset ring-white/[0.06]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a6dff]/20 text-sm font-semibold uppercase text-[#9cc4ff]">
                      {username.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">@{username}</p>
                    </div>
                  </div>
                )}

                <nav className="divide-y divide-white/[0.06]">
                  {items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between py-4 text-xl font-semibold tracking-tight transition-colors ${
                          active ? "text-white" : "text-[var(--muted)] hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          {active && <span className="h-2 w-2 rounded-full bg-[#1a6dff]" />}
                          <span>{item.label}</span>
                        </span>
                        <ArrowRightIcon className="h-4 w-4 text-[var(--subtle)]" />
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            <div
              className={`space-y-2.5 border-t border-white/[0.06] px-6 pb-8 pt-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Link
                href="/download"
                onClick={() => setOpen(false)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a6dff] text-[15px] font-medium text-white transition-colors hover:bg-[#145ee6]"
              >
                <DownloadIcon className="h-4 w-4" />
                <span>{downloadLabel}</span>
              </Link>

              {username ? (
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-[15px] font-medium text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-[#fda4af] cursor-pointer"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    <span>{signOutLabel}</span>
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-white/[0.05] text-[15px] font-medium text-white ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.1]"
                >
                  {signInLabel}
                </Link>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
