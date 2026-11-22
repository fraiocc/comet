"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { TargetCreateModal } from "@/components/TargetCreateModal";
import { TargetEditModal } from "@/components/TargetEditModal";
import { Button, LinkButton } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FieldError";
import {
  CheckIcon,
  ExternalLinkIcon,
  GitHubIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  TerminalIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import { Surface } from "@/components/ui/Surface";
import type { PublishResultItem, TargetDependency } from "@/db/schema";
import { formatBytes } from "@/lib/format";
import type { GitHubReleaseSummary } from "@/lib/github";

export interface TargetSummary {
  id: string;
  kind: string;
  enabled: boolean;
  externalProjectId: string;
  gameVersions: string[];
  loaders: string[];
  dependencies: TargetDependency[];
  channel: string | null;
  descriptionOverride: string | null;
}

export interface PublishHistoryItem {
  id: string;
  releaseTag: string;
  assetName: string;
  source: string;
  results: PublishResultItem[];
  createdAt: string;
}

interface ProjectDetailClientProps {
  project: {
    id: string;
    repoFullName: string;
    displayName: string;
    assetPattern: string;
    defaultChangelog: string | null;
    discordWebhookUrl: string | null;
  };
  initialTargets: TargetSummary[];
  initialHistory: PublishHistoryItem[];
}

type ProjectTab = "targets" | "releases" | "history" | "settings";

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProjectDetailClient({
  project,
  initialTargets,
  initialHistory,
}: ProjectDetailClientProps) {
  const t = useTranslations("project");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProjectTab>("targets");
  const [displayName, setDisplayName] = useState(project.displayName);
  const [assetPattern, setAssetPattern] = useState(project.assetPattern);
  const [defaultChangelog, setDefaultChangelog] = useState(project.defaultChangelog ?? "");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(project.discordWebhookUrl ?? "");
  const [testingWebhook, setTestingWebhook] = useState(false);

  const [targetList, setTargetList] = useState<TargetSummary[]>(initialTargets);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetSummary | null>(null);
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [releases, setReleases] = useState<GitHubReleaseSummary[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadReleases() {
      try {
        const resp = await fetch(
          `/api/github/releases?repo=${encodeURIComponent(project.repoFullName)}`,
        );
        const data = (await resp.json().catch(() => ({}))) as {
          releases?: GitHubReleaseSummary[];
        };
        if (!cancelled && resp.ok && data.releases) {
          setReleases(data.releases);
        }
      } finally {
        if (!cancelled) setLoadingReleases(false);
      }
    }
    loadReleases();
    return () => {
      cancelled = true;
    };
  }, [project.repoFullName]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    setSavingSettings(true);
    try {
      const resp = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || project.displayName,
          assetPattern,
          defaultChangelog: defaultChangelog || null,
          discordWebhookUrl: discordWebhookUrl.trim() || null,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (resp.ok) {
        setStatusMessage(t("saved"));
      } else {
        setErrorMessage(data.error ?? "Failed to save settings");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleTestWebhook() {
    setStatusMessage(null);
    setErrorMessage(null);
    setTestingWebhook(true);
    try {
      const resp = await fetch(`/api/projects/${project.id}/webhook-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: discordWebhookUrl.trim() }),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) {
        setErrorMessage(data.error ?? "Webhook test failed");
        return;
      }
      setStatusMessage(t("webhookTestSent"));
    } finally {
      setTestingWebhook(false);
    }
  }

  async function handleDeleteTarget(targetId: string) {
    setStatusMessage(null);
    setErrorMessage(null);
    setDeletingTargetId(targetId);
    try {
      const resp = await fetch(`/api/projects/${project.id}/targets/${targetId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        setErrorMessage("Failed to delete target");
        return;
      }
      setTargetList((prev) => prev.filter((item) => item.id !== targetId));
    } finally {
      setDeletingTargetId(null);
    }
  }

  async function handleDeleteProject() {
    setDeletingProject(true);
    try {
      const resp = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!resp.ok) {
        setErrorMessage("Failed to delete project");
        setDeleteModalOpen(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setDeletingProject(false);
    }
  }

  const activeTargetCount = targetList.filter((item) => item.enabled).length;
  const latestRelease = releases[0] ?? null;

  return (
    <div className="space-y-9">
      <div className="animate-fade-up space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] transition-colors hover:text-white"
        >
          &larr; {t("backToDashboard")}
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold uppercase text-[var(--accent)]">
              {displayName.slice(0, 1)}
            </span>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={`https://github.com/${project.repoFullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--muted)] transition-colors hover:text-white"
                >
                  <GitHubIcon className="h-3.5 w-3.5" />
                  {project.repoFullName}
                </a>
                <span className="text-[var(--subtle)]">&middot;</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    activeTargetCount > 0 ? "text-[var(--success)]" : "text-[var(--muted)]"
                  }`}
                >
                  {activeTargetCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  )}
                  {t("activeTargetsBadge", { count: activeTargetCount })}
                </span>
                <span className="text-[var(--subtle)]">&middot;</span>
                <span className="font-mono text-xs text-[var(--muted)]">{assetPattern}</span>
                {latestRelease && (
                  <>
                    <span className="text-[var(--subtle)]">&middot;</span>
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--accent)]">
                      {latestRelease.tagName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <LinkButton
              href={`https://github.com/${project.repoFullName}`}
              external
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              size="md"
            >
              <GitHubIcon className="h-4 w-4" />
              {t("openOnGithub")}
            </LinkButton>
            <Button
              type="button"
              size="md"
              onClick={() => setCreateModalOpen(true)}
            >
              <PlusIcon />
              {t("addTarget")}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-white/[0.06]">
          {(
            [
              { id: "targets", label: t("tabTargets"), count: targetList.length },
              { id: "releases", label: t("tabReleases"), count: releases.length },
              { id: "history", label: t("tabHistory"), count: initialHistory.length },
              { id: "settings", label: t("tabSettings"), count: null },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  isActive ? "text-white" : "text-[var(--muted)] hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-[#1a6dff]/20 text-[#9cc4ff]"
                        : "bg-white/[0.05] text-[var(--subtle)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#1a6dff]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <FormAlert message={statusMessage} variant="success" />
      <FormAlert message={errorMessage} variant="error" />

      {activeTab === "targets" && (
        <section className="animate-fade-up space-y-5">
          {targetList.length === 0 ? (
            <Surface className="flex flex-col items-center justify-center rounded-[24px] px-8 py-20 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <LayersIcon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">{t("targetsTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                {t("noTargets")}
              </p>
              <Button
                type="button"
                variant="primary"
                size="md"
                className="mt-6"
                onClick={() => setCreateModalOpen(true)}
              >
                <PlusIcon />
                {t("addTarget")}
              </Button>
            </Surface>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {targetList.map((target) => (
                <Surface key={target.id} className="flex flex-col justify-between rounded-[24px] p-6">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-semibold capitalize text-white">
                            {target.kind}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              target.enabled
                                ? "bg-[var(--success-bg)] text-[var(--success)]"
                                : "bg-[var(--bg)]/70 text-[var(--muted)]"
                            }`}
                          >
                            {target.enabled && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                            )}
                            {target.enabled ? t("enabled") : t("disabled")}
                          </span>
                          {target.channel && (
                            <span className="rounded-md bg-[var(--bg)]/70 px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                              {target.channel}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                          {target.externalProjectId}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={t("edit")}
                          aria-label={t("edit")}
                          onClick={() => setEditingTarget(target)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={t("delete")}
                          aria-label={t("delete")}
                          disabled={deletingTargetId === target.id}
                          onClick={() => handleDeleteTarget(target.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-[#fda4af] disabled:opacity-40 cursor-pointer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2.5 rounded-2xl bg-[var(--bg)]/60 p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs font-medium text-[var(--subtle)]">
                          {t("loaders")}
                        </span>
                        {target.loaders.map((loader) => (
                          <span
                            key={loader}
                            className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
                          >
                            {loader}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs font-medium text-[var(--subtle)]">
                          {t("gameVersions")}
                        </span>
                        {target.gameVersions.map((ver) => (
                          <span
                            key={ver}
                            className="rounded-md bg-[var(--surface)] px-2 py-0.5 font-mono text-xs text-[var(--text)]"
                          >
                            {ver}
                          </span>
                        ))}
                      </div>

                      {target.dependencies.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-xs font-medium text-[var(--subtle)]">
                            {t("dependencies")}
                          </span>
                          {target.dependencies.map((dep) => (
                            <span
                              key={`${dep.projectId}-${dep.dependencyType}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface)] px-2 py-0.5 text-xs text-white"
                            >
                              <span>{dep.name || dep.projectId}</span>
                              <span className="text-[11px] text-[var(--muted)]">
                                {dep.dependencyType}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "releases" && (
        <section className="animate-fade-up space-y-3">
          {loadingReleases ? (
            <div className="space-y-2.5">
              <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface)]" />
              <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface)]" />
            </div>
          ) : releases.length === 0 ? (
            <Surface className="rounded-[24px] px-8 py-16 text-center text-sm text-[var(--muted)]">
              {t("noReleases")}
            </Surface>
          ) : (
            <div className="space-y-2 rounded-[24px] bg-[var(--surface)] p-3 ring-1 ring-inset ring-white/[0.05]">
              {releases.map((rel, index) => (
                <div
                  key={rel.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl bg-[var(--bg)]/55 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white">
                        {rel.tagName}
                      </span>
                      {index === 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a6dff]/20 px-2.5 py-0.5 text-xs font-medium text-[#9cc4ff]">
                          {t("latestBadge")}
                        </span>
                      )}
                      {rel.prerelease && (
                        <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                          {t("prereleaseBadge")}
                        </span>
                      )}
                      {rel.name !== rel.tagName && (
                        <span className="text-sm text-[var(--muted)]">{rel.name}</span>
                      )}
                    </div>

                    {rel.assets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rel.assets.map((asset) => (
                          <span
                            key={asset.name}
                            className="rounded-md bg-[var(--surface)] px-2.5 py-1 font-mono text-xs text-[var(--accent)]"
                          >
                            {asset.name} ({formatBytes(asset.size)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <LinkButton
                    href={rel.htmlUrl}
                    external
                    target="_blank"
                    rel="noreferrer"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                  >
                    {t("viewOnGithub")}
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </LinkButton>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "history" && (
        <section className="animate-fade-up space-y-3">
          {initialHistory.length === 0 ? (
            <Surface className="flex flex-col items-center justify-center rounded-[24px] px-8 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <TerminalIcon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">{t("historyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                {t("noHistory")}
              </p>
            </Surface>
          ) : (
            <div className="space-y-2 rounded-[24px] bg-[var(--surface)] p-3 ring-1 ring-inset ring-white/[0.05]">
              {initialHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl bg-[var(--bg)]/55 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white">
                        {item.releaseTag}
                      </span>
                      <span className="rounded-full bg-[#1a6dff]/15 px-2.5 py-0.5 text-xs font-medium text-[#9cc4ff]">
                        {item.source === "ci" ? t("sourceCi") : t("sourceCli")}
                      </span>
                      <span className="font-mono text-xs text-[var(--muted)]">
                        {item.assetName}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {item.results.map((res, idx) =>
                        res.status === "success" && res.url ? (
                          <a
                            key={`${item.id}-${res.kind}-${idx}`}
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--success-bg)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--success)] transition-opacity hover:opacity-85"
                          >
                            <CheckIcon className="h-3 w-3" />
                            <span>{res.kind}</span>
                            <ExternalLinkIcon className="h-3 w-3 opacity-75" />
                          </a>
                        ) : res.status === "success" ? (
                          <span
                            key={`${item.id}-${res.kind}-${idx}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--success-bg)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--success)]"
                          >
                            <CheckIcon className="h-3 w-3" />
                            <span>{res.kind}</span>
                          </span>
                        ) : (
                          <span
                            key={`${item.id}-${res.kind}-${idx}`}
                            title={res.error ?? undefined}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-medium capitalize text-[#fda4af]"
                          >
                            <span>{res.kind}</span>
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 font-mono text-xs text-[var(--subtle)]">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "settings" && (
        <section className="animate-fade-up grid gap-6 lg:grid-cols-12">
          <Surface className="rounded-[24px] p-7 lg:col-span-7">
            <h2 className="text-lg font-semibold text-white">{t("settingsTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("settingsSubtitle")}</p>

            <form onSubmit={handleSaveSettings} noValidate className="mt-6 space-y-5">
              <div>
                <FieldLabel htmlFor="displayName">{t("displayNameLabel")}</FieldLabel>
                <Input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="assetPattern">{t("assetPattern")}</FieldLabel>
                <Input
                  id="assetPattern"
                  type="text"
                  value={assetPattern}
                  onChange={(e) => setAssetPattern(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <FieldLabel htmlFor="defaultChangelog">{t("defaultChangelog")}</FieldLabel>
                <Textarea
                  id="defaultChangelog"
                  rows={4}
                  value={defaultChangelog}
                  placeholder={t("defaultChangelogPlaceholder")}
                  onChange={(e) => setDefaultChangelog(e.target.value)}
                />
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                <FieldLabel htmlFor="discordWebhookUrl">{t("discordWebhookLabel")}</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="discordWebhookUrl"
                    type="url"
                    value={discordWebhookUrl}
                    placeholder={t("discordWebhookPlaceholder")}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={testingWebhook || !discordWebhookUrl.trim()}
                    onClick={handleTestWebhook}
                    className="shrink-0"
                  >
                    {testingWebhook ? t("testingWebhook") : t("testWebhook")}
                  </Button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--subtle)]">
                  {t("discordWebhookHint")}
                </p>
              </div>

              <Button type="submit" size="md" disabled={savingSettings}>
                {savingSettings ? t("saving") : t("saveSettings")}
              </Button>
            </form>
          </Surface>

          <div className="space-y-5 lg:col-span-5">
            <Surface className="rounded-[24px] p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <TerminalIcon className="h-4 w-4" />
                </span>
                <h2 className="text-base font-semibold text-white">{t("quickPublishTitle")}</h2>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                {t("quickPublishSubtitle")}
              </p>
              <div className="mt-4 space-y-2">
                <CopyField
                  value={`comet publish --repo ${project.repoFullName}`}
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                />
                <CopyField
                  value={`comet publish --repo ${project.repoFullName} --dry-run`}
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                />
              </div>
            </Surface>

            <Surface className="rounded-[24px] p-7">
              <h2 className="text-base font-semibold text-white">{t("dangerZoneTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {t("dangerZoneDesc")}
              </p>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={() => setDeleteModalOpen(true)}
                className="mt-5"
              >
                <TrashIcon className="h-4 w-4" />
                {t("deleteProject")}
              </Button>
            </Surface>
          </div>
        </section>
      )}

      {createModalOpen && (
        <TargetCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          projectId={project.id}
          onCreated={(created) => setTargetList((prev) => [...prev, created])}
        />
      )}

      {editingTarget && (
        <TargetEditModal
          key={editingTarget.id}
          open={Boolean(editingTarget)}
          onClose={() => setEditingTarget(null)}
          projectId={project.id}
          target={editingTarget}
          onUpdated={(updated) =>
            setTargetList((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            )
          }
        />
      )}

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t("deleteProjectTitle")}
        subtitle={t("deleteProjectDesc")}
        size="md"
      >
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={() => setDeleteModalOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="dangerSolid"
            disabled={deletingProject}
            onClick={handleDeleteProject}
          >
            {deletingProject ? t("deleting") : t("confirmDelete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
