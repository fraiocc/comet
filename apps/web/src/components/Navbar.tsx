import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { MobileNavMenu } from "@/components/MobileNavMenu";
import { NavLinks } from "@/components/NavLinks";
import { CometLogo } from "@/components/ui/CometLogo";
import { DownloadIcon, LogOutIcon } from "@/components/ui/Icons";

interface NavbarProps {
  username?: string | null;
}

export async function Navbar({ username }: NavbarProps) {
  const t = await getTranslations();

  const navItems = [
    { href: "/changelog", label: t("nav.changelog") },
    { href: "/pricing", label: t("nav.pricing") },
    ...(username ? [{ href: "/dashboard", label: t("nav.dashboard") }] : []),
  ];

  return (
    <header className="pointer-events-none sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl bg-[#111117]/80 pl-4 pr-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl sm:h-[68px] sm:gap-4 sm:pl-6 sm:pr-3.5">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-tight text-white transition-opacity hover:opacity-90"
        >
          <CometLogo size={28} />
          <span>{t("app.name")}</span>
        </Link>

        <nav aria-label="Primary">
          <NavLinks items={navItems} />
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {username ? (
            <div className="group relative hidden md:block">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-white/[0.06]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1a6dff]/20 text-xs font-semibold uppercase text-[#9cc4ff]">
                  {username.slice(0, 1)}
                </span>
                <span>{username}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-[var(--muted)] transition-transform duration-150 group-hover:rotate-180"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Link>

              <div className="pointer-events-none invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                <div className="w-48 rounded-xl bg-[#15151d] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.65)] ring-1 ring-inset ring-white/[0.08]">
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-[#fda4af] cursor-pointer"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      <span>{t("nav.signOut")}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden h-11 items-center rounded-xl bg-white/[0.04] px-4.5 text-[15px] font-medium text-white ring-1 ring-inset ring-white/[0.09] transition-colors duration-150 hover:bg-white/[0.09] md:inline-flex"
            >
              {t("nav.signIn")}
            </Link>
          )}

          <Link
            href="/download"
            className="hidden h-11 items-center gap-2 rounded-xl bg-[#1a6dff] px-5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-[#145ee6] md:inline-flex"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>{t("nav.download")}</span>
          </Link>

          <MobileNavMenu
            appName={t("app.name")}
            items={navItems}
            username={username}
            downloadLabel={t("nav.download")}
            signInLabel={t("nav.signIn")}
            signOutLabel={t("nav.signOut")}
          />
        </div>
      </div>
    </header>
  );
}
