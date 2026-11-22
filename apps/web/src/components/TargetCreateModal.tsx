"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FieldError";
import { LayersIcon } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import {
  HANGAR_PLATFORMS,
  ProviderProjectList,
  TargetConfigPanel,
  TargetStatusSwitch,
  type MinecraftMeta,
} from "@/components/target/TargetFormParts";
import type { TargetSummary } from "@/components/ProjectDetailClient";
import type { ProviderProjectOption } from "@/app/api/providers/projects/route";
import type { TargetDependency } from "@/db/schema";

interface TargetCreateModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (target: TargetSummary) => void;
}

export function TargetCreateModal({
  open,
  onClose,
  projectId,
  onCreated,
}: TargetCreateModalProps) {
  const t = useTranslations("project");

  const [meta, setMeta] = useState<MinecraftMeta | null>(null);
  const [kind, setKind] = useState<"modrinth" | "hangar">("modrinth");
  const [enabled, setEnabled] = useState(true);
  const [loaderGroup, setLoaderGroup] = useState<"plugins" | "mods">("plugins");

  const [token, setToken] = useState("");
  const [providerAccount, setProviderAccount] = useState<string | null>(null);
  const [providerProjects, setProviderProjects] = useState<ProviderProjectOption[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [manualIdMode, setManualIdMode] = useState(false);

  const [externalProjectId, setExternalProjectId] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [selectedLoaders, setSelectedLoaders] = useState<string[]>(["paper"]);
  const [dependencies, setDependencies] = useState<TargetDependency[]>([]);
  const [newDepId, setNewDepId] = useState("");
  const [newDepType, setNewDepType] = useState<TargetDependency["dependencyType"]>("required");
  const [copyingDeps, setCopyingDeps] = useState(false);
  const [depsNotice, setDepsNotice] = useState<string | null>(null);

  const [channel, setChannel] = useState("Release");
  const [descriptionOverride, setDescriptionOverride] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || meta) return;
    let cancelled = false;

    async function loadMeta() {
      const resp = await fetch("/api/meta/minecraft");
      if (!resp.ok) return;
      const data = (await resp.json()) as MinecraftMeta;
      if (cancelled) return;
      setMeta(data);
      if (data.gameVersions.length > 0) {
        setSelectedVersions([data.gameVersions[0]]);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [open, meta]);

  useEffect(() => {
    if (!open || manualIdMode) return;
    const trimmed = token.trim();
    if (trimmed.length < 8) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingProvider(true);
      setError(null);
      try {
        const resp = await fetch("/api/providers/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, token: trimmed }),
        });
        const data = (await resp.json().catch(() => ({}))) as {
          projects?: ProviderProjectOption[];
          account?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!resp.ok || !data.projects) {
          setProviderProjects([]);
          setProviderAccount(null);
          setProjectsLoaded(false);
          setError(data.error ?? "Failed to load projects");
          return;
        }
        setProviderProjects(data.projects);
        setProviderAccount(data.account ?? null);
        setProjectsLoaded(true);
      } finally {
        if (!cancelled) setLoadingProvider(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, manualIdMode, kind, token]);

  function handleKindChange(nextKind: "modrinth" | "hangar") {
    if (nextKind === kind) return;
    setKind(nextKind);
    setProviderProjects([]);
    setProviderAccount(null);
    setProjectsLoaded(false);
    setExternalProjectId("");
    setProjectSearch("");
    setDepsNotice(null);
    setError(null);
    if (nextKind === "hangar") {
      setSelectedLoaders((prev) => {
        const kept = prev.filter((l) => HANGAR_PLATFORMS.includes(l));
        return kept.length > 0 ? kept : ["paper"];
      });
    }
  }

  function handleSelectProject(proj: ProviderProjectOption) {
    setExternalProjectId(proj.id);
    setDepsNotice(null);
    if (kind === "modrinth") {
      if (proj.projectType === "mod") {
        setLoaderGroup("mods");
      } else if (proj.projectType === "plugin") {
        setLoaderGroup("plugins");
      }
    }
  }

  async function handleCopyFromLatest() {
    if (!externalProjectId.trim()) return;
    setCopyingDeps(true);
    setDepsNotice(null);
    setError(null);
    try {
      const resp = await fetch("/api/providers/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          externalProjectId: externalProjectId.trim(),
          ...(token.trim() ? { token: token.trim() } : {}),
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        dependencies?: TargetDependency[];
        versionNumber?: string | null;
        error?: string;
      };
      if (!resp.ok || !data.dependencies) {
        setError(data.error ?? "Failed to fetch previous version dependencies");
        return;
      }
      setDependencies(data.dependencies);
      if (data.dependencies.length > 0 && data.versionNumber) {
        setDepsNotice(t("depsImportedFrom", { version: data.versionNumber }));
      } else {
        setDepsNotice(t("noDepsInLatest"));
      }
    } finally {
      setCopyingDeps(false);
    }
  }

  function handleAddManualDep() {
    const id = newDepId.trim();
    if (!id) return;
    setDependencies((prev) => {
      const filtered = prev.filter((d) => d.projectId.toLowerCase() !== id.toLowerCase());
      return [...filtered, { projectId: id, name: id, dependencyType: newDepType }];
    });
    setNewDepId("");
    setDepsNotice(null);
  }

  function handleRemoveDep(depId: string) {
    setDependencies((prev) => prev.filter((d) => d.projectId !== depId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!externalProjectId.trim()) {
      setError("Select a project or enter a project ID");
      return;
    }
    if (!token.trim()) {
      setError("Platform API token is required");
      return;
    }
    if (selectedVersions.length === 0) {
      setError("Select at least one Minecraft version");
      return;
    }
    if (selectedLoaders.length === 0) {
      setError("Select at least one loader or platform");
      return;
    }

    setSubmitting(true);
    try {
      setVerifying(true);
      const verifyResp = await fetch("/api/providers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          token: token.trim(),
          externalProjectId: externalProjectId.trim(),
        }),
      });
      setVerifying(false);

      const verifyData = (await verifyResp.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!verifyResp.ok || !verifyData.ok) {
        setError(verifyData.error ?? "Credential verification failed");
        return;
      }

      const resp = await fetch(`/api/projects/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          enabled,
          externalProjectId: externalProjectId.trim(),
          token: token.trim(),
          gameVersions: selectedVersions,
          loaders: selectedLoaders,
          dependencies,
          channel: kind === "hangar" ? channel : null,
          descriptionOverride: descriptionOverride || null,
        }),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        target?: TargetSummary;
        error?: string;
      };

      if (!resp.ok || !data.target) {
        setError(data.error ?? "Failed to save target");
        return;
      }

      onCreated(data.target);
      onClose();
    } finally {
      setVerifying(false);
      setSubmitting(false);
    }
  }

  const readyToConfigure = Boolean(externalProjectId.trim()) || manualIdMode;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("addTarget")}
      subtitle={t("addTargetSubtitle")}
      size="xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormAlert message={error} />

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 rounded-2xl bg-[var(--bg)]/55 p-5 lg:col-span-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <FieldLabel>{t("targetKind")}</FieldLabel>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--surface)] p-1">
                  {(["modrinth", "hangar"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleKindChange(option)}
                      className={`rounded-lg py-2 text-xs font-medium capitalize transition-colors cursor-pointer ${
                        kind === option
                          ? "bg-[#1a6dff] text-white"
                          : "text-[var(--muted)] hover:text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <TargetStatusSwitch enabled={enabled} onChange={setEnabled} />
            </div>

            <div>
              <FieldLabel htmlFor="createTargetToken">{t("apiToken")}</FieldLabel>
              <Input
                id="createTargetToken"
                type="password"
                required
                placeholder={t("apiTokenPlaceholder")}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
              <p className="mt-2 text-xs leading-relaxed text-[var(--subtle)]">
                {kind === "modrinth" ? t("modrinthScopesHint") : t("hangarScopesHint")}
              </p>
            </div>

            <ProviderProjectList
              providerAccount={providerAccount}
              providerProjects={providerProjects}
              projectSearch={projectSearch}
              onProjectSearchChange={setProjectSearch}
              loadingProvider={loadingProvider}
              projectsLoaded={projectsLoaded}
              manualIdMode={manualIdMode}
              onToggleManualMode={() => setManualIdMode((v) => !v)}
              externalProjectId={externalProjectId}
              onExternalProjectIdChange={setExternalProjectId}
              onSelectProject={handleSelectProject}
            />
          </div>

          <div className="lg:col-span-7">
            {readyToConfigure ? (
              <TargetConfigPanel
                kind={kind}
                meta={meta}
                loaderGroup={loaderGroup}
                onLoaderGroupChange={setLoaderGroup}
                selectedLoaders={selectedLoaders}
                onLoadersChange={setSelectedLoaders}
                selectedVersions={selectedVersions}
                onVersionsChange={setSelectedVersions}
                channel={channel}
                onChannelChange={setChannel}
                dependencies={dependencies}
                newDepId={newDepId}
                onNewDepIdChange={setNewDepId}
                newDepType={newDepType}
                onNewDepTypeChange={setNewDepType}
                onAddManualDep={handleAddManualDep}
                onRemoveDep={handleRemoveDep}
                onCopyFromLatest={handleCopyFromLatest}
                copyingDeps={copyingDeps}
                depsNotice={depsNotice}
                canCopyDeps={Boolean(externalProjectId.trim())}
                descriptionOverride={descriptionOverride}
                onDescriptionOverrideChange={setDescriptionOverride}
              />
            ) : (
              <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl bg-[var(--bg)]/55 px-8 py-14 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--muted)]">
                  <LayersIcon className="h-5 w-5" />
                </span>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
                  {t("configureRightHint")}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] pt-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={submitting || !externalProjectId.trim() || !token.trim()}
          >
            {verifying ? t("verifyingTarget") : submitting ? t("saving") : t("saveTarget")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
