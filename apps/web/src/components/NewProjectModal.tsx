"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button, LinkButton } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { CheckIcon, GitHubIcon } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import type { GitHubReleaseSummary, GitHubRepoSummary } from "@/lib/github";

interface CreatedProject {
  id: string;
  repoFullName: string;
  displayName: string;
  assetPattern: string;
}

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  hasGithubToken: boolean;
  existingRepos: string[];
  onCreated: (project: CreatedProject) => void;
}

function suggestAssetPattern(releases: GitHubReleaseSummary[]): string {
  const firstAsset =
    releases[0]?.assets.find((a) => a.name.endsWith(".jar")) ?? releases[0]?.assets[0];
  if (!firstAsset) return "*.jar";
  const dotIdx = firstAsset.name.lastIndexOf(".");
  if (dotIdx > 0) {
    return `*${firstAsset.name.slice(dotIdx)}`;
  }
  return firstAsset.name;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewProjectModal({
  open,
  onClose,
  hasGithubToken,
  existingRepos,
  onCreated,
}: NewProjectModalProps) {
  const t = useTranslations("dashboard");
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoSummary | null>(null);
  const [releases, setReleases] = useState<GitHubReleaseSummary[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [assetPattern, setAssetPattern] = useState("*.jar");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !hasGithubToken) return;
    let cancelled = false;

    async function loadRepos() {
      setLoadingRepos(true);
      setRepoError(null);
      try {
        const resp = await fetch("/api/github/repos");
        const data = (await resp.json().catch(() => ({}))) as {
          repos?: GitHubRepoSummary[];
          error?: string;
        };
        if (cancelled) return;
        if (!resp.ok || !data.repos) {
          setRepoError(data.error ?? "Failed to load repositories");
          return;
        }
        setRepos(data.repos);
      } finally {
        if (!cancelled) setLoadingRepos(false);
      }
    }

    loadRepos();
    return () => {
      cancelled = true;
    };
  }, [open, hasGithubToken]);

  async function handleSelectRepo(repo: GitHubRepoSummary) {
    setSelectedRepo(repo);
    setDisplayName(repo.name);
    setSubmitError(null);
    setReleases([]);
    setLoadingReleases(true);

    try {
      const resp = await fetch(
        `/api/github/releases?repo=${encodeURIComponent(repo.fullName)}`,
      );
      const data = (await resp.json().catch(() => ({}))) as {
        releases?: GitHubReleaseSummary[];
      };
      if (resp.ok && data.releases) {
        setReleases(data.releases);
        if (data.releases.length > 0) {
          setAssetPattern(suggestAssetPattern(data.releases));
        }
      }
    } finally {
      setLoadingReleases(false);
    }
  }

  function handleResetAndClose() {
    setSelectedRepo(null);
    setReleases([]);
    setQuery("");
    setDisplayName("");
    setAssetPattern("*.jar");
    setSubmitError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRepo) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: selectedRepo.fullName,
          displayName: displayName.trim() || selectedRepo.name,
          assetPattern: assetPattern.trim() || "*.jar",
        }),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        project?: CreatedProject;
        error?: string;
      };

      if (!resp.ok || !data.project) {
        setSubmitError(data.error ?? "Failed to create project");
        return;
      }

      onCreated(data.project);
      handleResetAndClose();
    } finally {
      setSubmitting(false);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRepos = repos.filter((r) => {
    if (!normalizedQuery) return true;
    return (
      r.fullName.toLowerCase().includes(normalizedQuery) ||
      (r.description?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  });

  const existingSet = new Set(existingRepos.map((r) => r.toLowerCase()));

  return (
    <Modal
      open={open}
      onClose={handleResetAndClose}
      title={t("addProject")}
      subtitle={t("addProjectSubtitle")}
    >
      {!hasGithubToken ? (
        <div className="flex flex-col items-center rounded-2xl bg-[var(--bg)]/55 px-8 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <GitHubIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-white">{t("githubRequiredTitle")}</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            {t("githubRequiredDesc")}
          </p>
          <div className="mt-7 flex items-center gap-2.5">
            <Button type="button" variant="ghost" onClick={handleResetAndClose}>
              {t("cancel")}
            </Button>
            <LinkButton href="/api/auth/github" external variant="primary" size="md">
              <GitHubIcon className="h-4 w-4" />
              {t("connectGithub")}
            </LinkButton>
          </div>
        </div>
      ) : !selectedRepo ? (
        <div className="space-y-4 rounded-2xl bg-[var(--bg)]/55 p-5">
          <Input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchReposPlaceholder")}
          />

          {repoError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
              <span>{repoError}</span>
              <LinkButton href="/api/auth/github" external variant="secondary" size="sm">
                {t("reconnectGithub")}
              </LinkButton>
            </div>
          )}

          {loadingRepos ? (
            <div className="space-y-1.5">
              <div className="h-15 animate-pulse rounded-xl bg-[var(--surface)]" />
              <div className="h-15 animate-pulse rounded-xl bg-[var(--surface)]" />
              <div className="h-15 animate-pulse rounded-xl bg-[var(--surface)]" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="rounded-xl bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--muted)]">
              {t("noMatchingRepos")}
            </div>
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {filteredRepos.map((repo) => {
                const alreadyAdded = existingSet.has(repo.fullName.toLowerCase());
                return (
                  <button
                    key={repo.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleSelectRepo(repo)}
                    className="group flex w-full items-center gap-3.5 rounded-xl bg-[var(--surface)] px-3.5 py-3 text-left transition-colors duration-150 hover:bg-[var(--surface-2)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-semibold uppercase text-[var(--accent)]">
                      {repo.name.slice(0, 1)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{repo.fullName}</p>
                      {repo.description && (
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {repo.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {repo.private && (
                        <span className="rounded-md bg-[var(--bg)]/70 px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                          {t("privateRepo")}
                        </span>
                      )}
                      {repo.language && (
                        <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                          {repo.language}
                        </span>
                      )}
                      {alreadyAdded && (
                        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
              {submitError}
            </div>
          )}

          <div className="space-y-4 rounded-2xl bg-[var(--bg)]/55 p-5">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--surface)] px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-sm font-semibold uppercase text-[var(--accent)]">
                  {selectedRepo.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">{t("selectedRepo")}</p>
                  <p className="truncate font-mono text-sm font-medium text-white">
                    {selectedRepo.fullName}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRepo(null);
                  setReleases([]);
                }}
              >
                {t("changeRepo")}
              </Button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--muted)]">
                  {t("releasesPreviewTitle")}
                </span>
                {!loadingReleases && releases.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--success)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {releases[0].tagName}
                  </span>
                )}
              </div>

              {loadingReleases ? (
                <div className="h-16 animate-pulse rounded-xl bg-[var(--surface)]" />
              ) : releases.length === 0 ? (
                <div className="rounded-xl bg-[var(--surface)] px-4 py-4 text-xs leading-relaxed text-[var(--muted)]">
                  {t("noReleasesYet")}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {releases.slice(0, 3).map((rel, index) => (
                    <div
                      key={rel.id}
                      className="rounded-xl bg-[var(--surface)] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          {rel.tagName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {index === 0 && (
                            <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                              {t("latestBadge")}
                            </span>
                          )}
                          {rel.prerelease && (
                            <span className="rounded-md bg-[var(--bg)]/70 px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                              {t("prereleaseBadge")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {rel.assets.length === 0 ? (
                          <span className="text-xs text-[var(--subtle)]">{t("noAssets")}</span>
                        ) : (
                          rel.assets.map((asset) => (
                            <span
                              key={asset.name}
                              className="rounded-md bg-[var(--bg)]/70 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]"
                            >
                              {asset.name} ({formatBytes(asset.size)})
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl bg-[var(--bg)]/55 p-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="displayName">{t("displayNameLabel")}</FieldLabel>
              <Input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("displayNamePlaceholder")}
              />
            </div>

            <div>
              <FieldLabel htmlFor="assetPattern">{t("assetPatternLabel")}</FieldLabel>
              <Input
                id="assetPattern"
                type="text"
                required
                value={assetPattern}
                onChange={(e) => setAssetPattern(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button type="button" variant="ghost" onClick={handleResetAndClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("creating") : t("createProject")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
