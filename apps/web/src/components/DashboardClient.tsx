"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { CliTokensModal } from "@/components/CliTokensModal";
import { NewProjectModal } from "@/components/NewProjectModal";
import { Button, LinkButton } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { FormAlert } from "@/components/ui/FieldError";
import {
  ArrowRightIcon,
  CheckIcon,
  FolderIcon,
  GitHubIcon,
  KeyIcon,
  PlusIcon,
  TerminalIcon,
} from "@/components/ui/Icons";
import { Surface } from "@/components/ui/Surface";
import type { PublishResultItem } from "@/db/schema";

export interface ProjectSummary {
  id: string;
  repoFullName: string;
  displayName: string;
  assetPattern: string;
  targetCount: number;
  targetKinds: string[];
}

export interface RecentPublishSummary {
  id: string;
  projectId: string;
  projectName: string;
  releaseTag: string;
  source: string;
  results: PublishResultItem[];
  createdAt: string;
}

interface DashboardClientProps {
  initialProjects: ProjectSummary[];
  recentPublishes: RecentPublishSummary[];
  initialGithubUsername: string | null;
  initialHasGithubToken: boolean;
  hasPassword: boolean;
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DashboardClient({
  initialProjects,
  recentPublishes,
  initialGithubUsername,
  initialHasGithubToken,
  hasPassword,
}: DashboardClientProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [githubUsername, setGithubUsername] = useState<string | null>(initialGithubUsername);
  const [hasGithubToken, setHasGithubToken] = useState(initialHasGithubToken);
  const [search, setSearch] = useState("");

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlinkGithub() {
    setError(null);
    const resp = await fetch("/api/auth/github/unlink", { method: "POST" });
    if (!resp.ok) {
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Failed to disconnect GitHub");
      return;
    }
    setGithubUsername(null);
    setHasGithubToken(false);
  }

  const normalized = search.trim().toLowerCase();
  const visibleProjects = projects.filter((p) => {
    if (!normalized) return true;
    return (
      p.displayName.toLowerCase().includes(normalized) ||
      p.repoFullName.toLowerCase().includes(normalized)
    );
  });

  const totalActiveTargets = projects.reduce((sum, p) => sum + p.targetCount, 0);
  const latestPublish = recentPublishes[0] ?? null;

  return (
    <div className="space-y-7 sm:space-y-9">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:shrink-0 sm:items-center">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => setTokenModalOpen(true)}
          >
            <KeyIcon />
            {t("cliTokenAction")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => setProjectModalOpen(true)}
          >
            <PlusIcon />
            {t("addProject")}
          </Button>
        </div>
      </div>

      <FormAlert message={error} />

      <section className="animate-fade-up-delay-1 grid grid-cols-3 gap-2.5 sm:gap-4">
        <Surface className="rounded-2xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[var(--muted)] sm:text-xs">
              {t("statProjects")}
            </p>
            <FolderIcon className="hidden h-4 w-4 text-[var(--subtle)] sm:block" />
          </div>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:mt-2.5 sm:text-2xl">
            {projects.length}
          </p>
        </Surface>

        <Surface className="rounded-2xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[var(--muted)] sm:text-xs">
              {t("statActiveTargets")}
            </p>
            <CheckIcon className="hidden h-4 w-4 text-[var(--success)]/75 sm:block" />
          </div>
          <div className="mt-1.5 flex items-center gap-2 sm:mt-2.5">
            <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {totalActiveTargets}
            </p>
            {totalActiveTargets > 0 && (
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            )}
          </div>
        </Surface>

        <Surface className="rounded-2xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[var(--muted)] sm:text-xs">
              {t("statPublishes")}
            </p>
            <TerminalIcon className="hidden h-4 w-4 text-[var(--accent)]/75 sm:block" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2 sm:mt-2.5">
            <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {recentPublishes.length}
            </p>
            {latestPublish ? (
              <span className="hidden truncate rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--accent)] sm:inline-block">
                {latestPublish.releaseTag}
              </span>
            ) : (
              <span className="hidden text-xs text-[var(--subtle)] sm:inline">
                {t("statNoPublishes")}
              </span>
            )}
          </div>
        </Surface>
      </section>

      <section className="animate-fade-up-delay-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-white">{t("projectsHeading")}</h2>
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
              {projects.length}
            </span>
          </div>

          {projects.length > 2 && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchReposPlaceholder")}
              className="w-full rounded-xl bg-[var(--surface)] px-4 py-2 text-sm text-white placeholder:text-[var(--subtle)] ring-1 ring-inset ring-white/[0.06] outline-none transition-colors focus:bg-[var(--surface-2)] focus:ring-[#1a6dff]/50 sm:w-64 sm:rounded-full"
            />
          )}
        </div>

        {projects.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center sm:rounded-[24px] sm:px-8 sm:py-16">
            <p className="text-lg font-semibold text-white">{t("noProjectsTitle")}</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              {t("noProjects")}
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="mt-6"
              onClick={() => setProjectModalOpen(true)}
            >
              <PlusIcon />
              {t("addProject")}
            </Button>
          </Surface>
        ) : visibleProjects.length === 0 ? (
          <Surface className="rounded-2xl px-6 py-10 text-center text-sm text-[var(--muted)]">
            {t("noMatchingRepos")}
          </Surface>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="group block min-w-0">
                <Surface
                  interactive
                  className="flex h-full flex-col justify-between rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-semibold uppercase text-[var(--accent)]">
                        {project.displayName.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                          {project.displayName}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs text-[var(--muted)]">
                          {project.repoFullName}
                        </p>
                      </div>
                    </div>

                    <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-[var(--subtle)] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg)]/60 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {project.targetKinds.length > 0 ? (
                        project.targetKinds.map((kind) => (
                          <span
                            key={kind}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface)] px-2 py-0.5 text-xs font-medium capitalize text-white/90"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                            {kind}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--subtle)]">
                          {t("targetsConfigured", { count: 0 })}
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                      {project.assetPattern}
                    </span>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="animate-fade-up-delay-2 grid gap-4 lg:grid-cols-12">
        <Surface className="rounded-2xl p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">{t("recentActivityTitle")}</h2>
            {recentPublishes.length > 0 && (
              <span className="font-mono text-xs text-[var(--subtle)]">
                {recentPublishes.length}
              </span>
            )}
          </div>

          {recentPublishes.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[var(--bg)]/60 px-4 py-6 text-center text-xs leading-relaxed text-[var(--muted)]">
              {t("recentActivityEmpty")}
            </p>
          ) : (
            <div className="mt-3.5 space-y-2">
              {recentPublishes.map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${item.projectId}`}
                  className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-[var(--bg)]/60 px-3.5 py-3 transition-colors hover:bg-[var(--bg)]/90"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {item.projectName}
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--accent)]">
                        {item.releaseTag}
                      </span>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase text-[var(--muted)]">
                        {item.source === "ci" ? "CI" : "CLI"}
                      </span>
                    </div>

                    {item.results.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.results.map((res, idx) => (
                          <span
                            key={`${item.id}-${res.kind}-${idx}`}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                              res.status === "success"
                                ? "bg-[var(--success-bg)] text-[var(--success)]"
                                : "bg-rose-500/10 text-[#fda4af]"
                            }`}
                          >
                            {res.status === "success" && <CheckIcon className="h-2.5 w-2.5" />}
                            {res.kind}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="shrink-0 font-mono text-xs text-[var(--subtle)]">
                    {formatShortDate(item.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Surface>

        <div className="space-y-4 lg:col-span-5">
          <Surface className="rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg)]/70 text-white">
                  <GitHubIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{t("githubTitle")}</span>
                    {githubUsername && (
                      <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
                        <span className="truncate">@{githubUsername}</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                    {githubUsername
                      ? t("githubConnected", { username: githubUsername })
                      : t("githubNotConnected")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {githubUsername ? (
                <>
                  {!hasGithubToken && (
                    <LinkButton href="/api/auth/github" external variant="primary" size="sm">
                      {t("reconnectGithub")}
                    </LinkButton>
                  )}
                  {hasPassword && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="bg-rose-500/10"
                      onClick={handleUnlinkGithub}
                    >
                      {t("disconnectGithub")}
                    </Button>
                  )}
                </>
              ) : (
                <LinkButton href="/api/auth/github" external variant="secondary" size="sm">
                  {t("connectGithub")}
                </LinkButton>
              )}
            </div>
          </Surface>

          <Surface className="rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg)]/70 text-[#8296ff]">
                <TerminalIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-white">{t("quickStartTitle")}</span>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                  {t("quickStartSubtitle")}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <CopyField value="comet" copyLabel={t("copyToken")} copiedLabel={t("copied")} />
            </div>
          </Surface>
        </div>
      </section>

      <NewProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        hasGithubToken={hasGithubToken}
        existingRepos={projects.map((p) => p.repoFullName)}
        onCreated={(created) => {
          setProjects((prev) => [
            ...prev,
            { ...created, targetCount: 0, targetKinds: [] },
          ]);
          router.refresh();
        }}
      />

      <CliTokensModal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </div>
  );
}
