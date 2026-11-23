"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { CliTokensModal } from "@/components/CliTokensModal";
import { NewProjectModal } from "@/components/NewProjectModal";
import { Button, LinkButton } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { FormAlert } from "@/components/ui/FieldError";
import {
  ArrowRightIcon,
  GitHubIcon,
  KeyIcon,
  PlusIcon,
  TerminalIcon,
} from "@/components/ui/Icons";
import { Surface } from "@/components/ui/Surface";

export interface ProjectSummary {
  id: string;
  repoFullName: string;
  displayName: string;
  assetPattern: string;
  targetCount: number;
  targetKinds: string[];
}

interface DashboardClientProps {
  initialProjects: ProjectSummary[];
  initialGithubUsername: string | null;
  initialHasGithubToken: boolean;
  hasPassword: boolean;
}

export function DashboardClient({
  initialProjects,
  initialGithubUsername,
  initialHasGithubToken,
  hasPassword,
}: DashboardClientProps) {
  const t = useTranslations("dashboard");
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

  return (
    <div className="space-y-7 sm:space-y-10">
      <div className="animate-fade-up flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)] sm:mt-2 sm:text-base">
            {t("subtitle")}
          </p>
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

      <div className="animate-fade-up-delay-1 grid divide-y divide-white/[0.05] overflow-hidden rounded-2xl bg-[var(--surface)] ring-1 ring-inset ring-white/[0.05] sm:rounded-[24px] md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex flex-col gap-3.5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg)]/70 text-[#9cc4ff]">
              <GitHubIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{t("githubTitle")}</span>
                {githubUsername && (
                  <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
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

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {githubUsername ? (
              <>
                {!hasGithubToken && (
                  <LinkButton
                    href="/api/auth/github"
                    external
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {t("reconnectGithub")}
                  </LinkButton>
                )}
                {hasPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={handleUnlinkGithub}
                  >
                    {t("disconnectGithub")}
                  </Button>
                )}
              </>
            ) : (
              <LinkButton
                href="/api/auth/github"
                external
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
              >
                {t("connectGithub")}
              </LinkButton>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
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

          <div className="w-full shrink-0 sm:w-44">
            <CopyField value="comet" copyLabel={t("copyToken")} copiedLabel={t("copied")} />
          </div>
        </div>
      </div>

      <section className="animate-fade-up-delay-2 space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-white">{t("projectsHeading")}</h2>
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
              {projects.length}
            </span>
          </div>

          {projects.length > 3 && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchReposPlaceholder")}
              className="w-full rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm text-white placeholder:text-[var(--subtle)] ring-1 ring-inset ring-white/[0.06] outline-none transition-colors focus:bg-[var(--surface-2)] focus:ring-[#1a6dff]/50 sm:w-64 sm:rounded-full sm:py-2"
            />
          )}
        </div>

        {projects.length === 0 ? (
          <Surface className="flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center sm:rounded-[24px] sm:px-8 sm:py-20">
            <p className="text-lg font-semibold text-white sm:text-xl">{t("noProjectsTitle")}</p>
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
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="group block min-w-0">
                <Surface
                  interactive
                  className="flex h-full flex-col justify-between rounded-2xl p-4 sm:rounded-[24px] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-semibold uppercase text-[var(--accent)]">
                        {project.displayName.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-white sm:text-base">
                          {project.displayName}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs text-[var(--muted)]">
                          {project.repoFullName}
                        </p>
                      </div>
                    </div>

                    <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-[var(--subtle)] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg)]/60 px-3 py-2.5 sm:mt-6 sm:px-3.5">
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

      <NewProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        hasGithubToken={hasGithubToken}
        existingRepos={projects.map((p) => p.repoFullName)}
        onCreated={(created) =>
          setProjects((prev) => [
            ...prev,
            { ...created, targetCount: 0, targetKinds: [] },
          ])
        }
      />

      <CliTokensModal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} />
    </div>
  );
}
