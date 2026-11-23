"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { CliTokensModal } from "@/components/CliTokensModal";
import { CometLogo } from "@/components/ui/CometLogo";
import {
  DownloadIcon,
  FolderIcon,
  GitHubIcon,
  KeyIcon,
  LogOutIcon,
} from "@/components/ui/Icons";
import { APP_VERSION } from "@/lib/version";

export interface SidebarProject {
  id: string;
  displayName: string;
  repoFullName: string;
  targetCount: number;
}

interface WorkspaceShellProps {
  username: string;
  githubUsername: string | null;
  projects: SidebarProject[];
  children: ReactNode;
}

export function WorkspaceShell({
  username,
  githubUsername,
  projects,
  children,
}: WorkspaceShellProps) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  function renderSidebarContent(onNavigate?: () => void) {
    const isOverview = pathname === "/dashboard";

    return (
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-opacity hover:opacity-90"
          >
            <CometLogo size={28} />
            <span className="text-[15px] font-semibold tracking-tight text-white">Comet</span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--muted)]">
              v{APP_VERSION}
            </span>
          </Link>

          {onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              aria-label={t("closeSidebar")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4.5 w-4.5"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <nav className="shrink-0 space-y-1 px-3 pt-1">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isOverview
                ? "bg-white/[0.08] text-white"
                : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <FolderIcon className="h-4 w-4 shrink-0" />
            <span>{t("navOverview")}</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setTokenModalOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer"
          >
            <KeyIcon className="h-4 w-4 shrink-0" />
            <span>{t("navTokens")}</span>
          </button>

          <Link
            href="/download"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <DownloadIcon className="h-4 w-4 shrink-0" />
            <span>{t("navDownload")}</span>
          </Link>
        </nav>

        <div className="mx-4 my-4 h-px shrink-0 bg-white/[0.06]" />

        <div className="flex min-h-0 flex-1 flex-col px-3">
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle)]">
              {t("navProjects")}
            </span>
            <span className="font-mono text-[11px] text-[var(--subtle)]">{projects.length}</span>
          </div>

          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--subtle)]">{t("navNoProjects")}</p>
          ) : (
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
              {projects.map((project) => {
                const href = `/projects/${project.id}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={project.id}
                    href={href}
                    onClick={onNavigate}
                    className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--accent-soft)] font-medium text-white"
                        : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold uppercase ${
                          isActive
                            ? "bg-[#1a6dff] text-white"
                            : "bg-white/[0.06] text-[var(--accent)]"
                        }`}
                      >
                        {project.displayName.slice(0, 1)}
                      </span>
                      <span className="truncate">{project.displayName}</span>
                    </div>
                    {project.targetCount > 0 && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]"
                        title={t("targetsConfigured", { count: project.targetCount })}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto shrink-0 border-t border-white/[0.06] p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold uppercase text-[var(--accent)]">
                {username.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">@{username}</p>
                {githubUsername && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[var(--muted)]">
                    <GitHubIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{githubUsername}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              title={t("navSignOut")}
              aria-label={t("navSignOut")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-[#fda4af] disabled:opacity-40 cursor-pointer"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-x-clip">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-white/[0.06] bg-[#0c0b10] lg:flex">
        {renderSidebarContent()}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0c0b10]/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("openSidebar")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white transition-colors hover:bg-white/[0.1] cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4.5 w-4.5"
              aria-hidden="true"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="15" y2="17" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <CometLogo size={24} />
            <span className="text-sm font-semibold tracking-tight text-white">Comet</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTokenModalOpen(true)}
            aria-label={t("navTokens")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--muted)] transition-colors hover:bg-white/[0.1] hover:text-white cursor-pointer"
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold uppercase text-[var(--accent)]">
            {username.slice(0, 1)}
          </span>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="animate-fade-in fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#0c0b10] shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
            {renderSidebarContent(() => setDrawerOpen(false))}
          </aside>
        </div>
      )}

      <div className="lg:pl-[252px]">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>

      <CliTokensModal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </div>
  );
}
