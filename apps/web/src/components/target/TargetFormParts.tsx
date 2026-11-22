"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { FieldLabel, Input } from "@/components/ui/Field";
import { CheckIcon, PlusIcon } from "@/components/ui/Icons";
import { MultiSelectPicker } from "@/components/ui/MultiSelectPicker";
import type { ProviderProjectOption } from "@/app/api/providers/projects/route";
import type { TargetDependency } from "@/db/schema";

export type TargetKindOption = "modrinth" | "hangar" | "curseforge";

export interface MinecraftMeta {
  gameVersions: string[];
  loaders: {
    plugins: string[];
    mods: string[];
  };
}

export const HANGAR_PLATFORMS = ["paper", "velocity", "waterfall"];
export const HANGAR_CHANNELS = ["Release", "Snapshot", "Alpha"];

const LOADER_LABELS: Record<string, string> = {
  neoforge: "NeoForge",
  bungeecord: "BungeeCord",
  liteloader: "LiteLoader",
  paper: "Paper",
  purpur: "Purpur",
  spigot: "Spigot",
  bukkit: "Bukkit",
  folia: "Folia",
  velocity: "Velocity",
  waterfall: "Waterfall",
  sponge: "Sponge",
  fabric: "Fabric",
  forge: "Forge",
  quilt: "Quilt",
  rift: "Rift",
};

export function formatLoaderName(value: string): string {
  return LOADER_LABELS[value.toLowerCase()] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

interface StatusSwitchProps {
  enabled: boolean;
  onChange: (next: boolean) => void;
}

export function TargetStatusSwitch({ enabled, onChange }: StatusSwitchProps) {
  const t = useTranslations("project");
  return (
    <div>
      <FieldLabel>{t("targetStatus")}</FieldLabel>
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--surface)] p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-lg py-2 text-xs font-medium transition-colors cursor-pointer ${
            enabled
              ? "bg-[var(--success-bg)] text-[var(--success)]"
              : "text-[var(--muted)] hover:text-white"
          }`}
        >
          {t("enabled")}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-lg py-2 text-xs font-medium transition-colors cursor-pointer ${
            !enabled
              ? "bg-[var(--surface-2)] text-white"
              : "text-[var(--muted)] hover:text-white"
          }`}
        >
          {t("disabled")}
        </button>
      </div>
    </div>
  );
}

interface ProviderProjectListProps {
  providerAccount: string | null;
  providerProjects: ProviderProjectOption[];
  projectSearch: string;
  onProjectSearchChange: (val: string) => void;
  loadingProvider: boolean;
  projectsLoaded: boolean;
  manualIdMode: boolean;
  onToggleManualMode: () => void;
  externalProjectId: string;
  onExternalProjectIdChange: (val: string) => void;
  onSelectProject: (proj: ProviderProjectOption) => void;
}

export function ProviderProjectList({
  providerAccount,
  providerProjects,
  projectSearch,
  onProjectSearchChange,
  loadingProvider,
  projectsLoaded,
  manualIdMode,
  onToggleManualMode,
  externalProjectId,
  onExternalProjectIdChange,
  onSelectProject,
}: ProviderProjectListProps) {
  const t = useTranslations("project");

  const normalizedSearch = projectSearch.trim().toLowerCase();
  const filtered = providerProjects.filter((p) => {
    if (!normalizedSearch) return true;
    return (
      p.title.toLowerCase().includes(normalizedSearch) ||
      p.slug.toLowerCase().includes(normalizedSearch) ||
      p.id.toLowerCase().includes(normalizedSearch) ||
      (p.owner?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--muted)]">{t("selectProject")}</span>
          {providerAccount && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              {providerAccount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleManualMode}
          className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-white cursor-pointer"
        >
          {t("manualIdToggle")}
        </button>
      </div>

      {manualIdMode ? (
        <Input
          id="externalProjectId"
          type="text"
          required
          placeholder={t("externalProjectIdPlaceholder")}
          value={externalProjectId}
          onChange={(e) => onExternalProjectIdChange(e.target.value)}
        />
      ) : loadingProvider ? (
        <div className="space-y-1.5">
          <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
          <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
          <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
        </div>
      ) : !projectsLoaded ? (
        <div className="rounded-xl bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t("pasteTokenHint")}
        </div>
      ) : providerProjects.length === 0 ? (
        <div className="rounded-xl bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t("noProviderProjects")}
        </div>
      ) : (
        <div className="space-y-2">
          {providerProjects.length > 5 && (
            <Input
              type="text"
              value={projectSearch}
              onChange={(e) => onProjectSearchChange(e.target.value)}
              placeholder={t("searchProviderProjects")}
            />
          )}
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtered.map((proj) => {
              const selected =
                externalProjectId === proj.id || externalProjectId === proj.slug;
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onSelectProject(proj)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-150 cursor-pointer ${
                    selected
                      ? "bg-[var(--surface-hover)] text-white"
                      : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-white"
                  }`}
                >
                  {proj.iconUrl ? (
                    <Image
                      src={proj.iconUrl}
                      alt={proj.title}
                      width={34}
                      height={34}
                      unoptimized
                      className="h-8.5 w-8.5 shrink-0 rounded-lg bg-[var(--surface-2)] object-cover"
                    />
                  ) : (
                    <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-xs font-semibold uppercase text-[var(--accent)]">
                      {proj.title.slice(0, 1)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{proj.title}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--subtle)]">
                      {proj.slug}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {proj.owner && (
                      <span
                        className={`hidden rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-block ${
                          proj.isOrg
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--bg)]/70 text-[var(--muted)]"
                        }`}
                      >
                        {proj.owner}
                      </span>
                    )}
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                        selected
                          ? "bg-[#1a6dff] text-white"
                          : "bg-[var(--surface-2)] text-transparent group-hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface TargetConfigPanelProps {
  kind: TargetKindOption;
  meta: MinecraftMeta | null;
  loaderGroup: "plugins" | "mods";
  onLoaderGroupChange: (g: "plugins" | "mods") => void;
  selectedLoaders: string[];
  onLoadersChange: (next: string[]) => void;
  selectedVersions: string[];
  onVersionsChange: (next: string[]) => void;
  channel: string;
  onChannelChange: (c: string) => void;
  dependencies: TargetDependency[];
  newDepId: string;
  onNewDepIdChange: (v: string) => void;
  newDepType: TargetDependency["dependencyType"];
  onNewDepTypeChange: (v: TargetDependency["dependencyType"]) => void;
  onAddManualDep: () => void;
  onRemoveDep: (id: string) => void;
  onCopyFromLatest: () => void;
  copyingDeps: boolean;
  depsNotice: string | null;
  canCopyDeps: boolean;
  descriptionOverride: string;
  onDescriptionOverrideChange: (v: string) => void;
}

export function TargetConfigPanel({
  kind,
  meta,
  loaderGroup,
  onLoaderGroupChange,
  selectedLoaders,
  onLoadersChange,
  selectedVersions,
  onVersionsChange,
  channel,
  onChannelChange,
  dependencies,
  newDepId,
  onNewDepIdChange,
  newDepType,
  onNewDepTypeChange,
  onAddManualDep,
  onRemoveDep,
  onCopyFromLatest,
  copyingDeps,
  depsNotice,
  canCopyDeps,
  descriptionOverride,
  onDescriptionOverrideChange,
}: TargetConfigPanelProps) {
  const t = useTranslations("project");

  const loaderOptions =
    kind === "hangar"
      ? HANGAR_PLATFORMS
      : loaderGroup === "plugins"
        ? (meta?.loaders.plugins ?? ["paper", "purpur", "spigot", "bukkit", "folia", "velocity"])
        : (meta?.loaders.mods ?? ["fabric", "neoforge", "forge", "quilt"]);

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl bg-[var(--bg)]/55 p-5">
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--muted)]">{t("loaders")}</span>
            <div className="flex items-center gap-2.5">
              {kind !== "hangar" && (
                <div className="inline-flex rounded-lg bg-[var(--surface)] p-0.5">
                  <button
                    type="button"
                    onClick={() => onLoaderGroupChange("plugins")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      loaderGroup === "plugins"
                        ? "bg-[#1a6dff] text-white"
                        : "text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {t("pluginsTab")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoaderGroupChange("mods")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      loaderGroup === "mods"
                        ? "bg-[#1a6dff] text-white"
                        : "text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {t("modsTab")}
                  </button>
                </div>
              )}
              {selectedLoaders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onLoadersChange([])}
                  className="text-xs text-[var(--muted)] hover:text-white cursor-pointer"
                >
                  {t("clear")} ({selectedLoaders.length})
                </button>
              )}
            </div>
          </div>

          <MultiSelectPicker
            options={loaderOptions}
            selected={selectedLoaders}
            onChange={onLoadersChange}
            formatLabel={formatLoaderName}
            maxHeightClass="max-h-32"
          />
        </div>

        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--muted)]">{t("gameVersions")}</span>
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span>{t("selectedCount", { count: selectedVersions.length })}</span>
              {selectedVersions.length > 0 && (
                <button
                  type="button"
                  onClick={() => onVersionsChange([])}
                  className="hover:text-white cursor-pointer"
                >
                  {t("clear")}
                </button>
              )}
            </div>
          </div>

          <MultiSelectPicker
            options={meta?.gameVersions ?? []}
            selected={selectedVersions}
            onChange={onVersionsChange}
            searchable
            searchPlaceholder={t("searchVersions")}
            maxHeightClass="max-h-36"
          />
        </div>

        {kind === "hangar" && (
          <div>
            <FieldLabel>{t("channel")}</FieldLabel>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--surface)] p-1">
              {HANGAR_CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChannelChange(c)}
                  className={`rounded-lg py-2 text-xs font-medium transition-colors cursor-pointer ${
                    channel === c
                      ? "bg-[#1a6dff] text-white"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl bg-[var(--bg)]/55 p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--muted)]">{t("dependencies")}</span>
            {kind !== "curseforge" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={copyingDeps || !canCopyDeps}
                onClick={onCopyFromLatest}
              >
                {copyingDeps ? t("copyingDeps") : t("copyFromLatest")}
              </Button>
            )}
          </div>

          {depsNotice && <p className="text-xs text-[var(--accent)]">{depsNotice}</p>}

          {dependencies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dependencies.map((dep) => (
                <span
                  key={dep.projectId}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/[0.06]"
                >
                  <span>{dep.name || dep.projectId}</span>
                  <span className="rounded bg-[var(--bg)]/80 px-1.5 py-0.5 text-[11px] text-[#9cc4ff]">
                    {dep.dependencyType}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveDep(dep.projectId)}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-[#fda4af] cursor-pointer"
                    aria-label="Remove dependency"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={newDepId}
              onChange={(e) => onNewDepIdChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddManualDep();
                }
              }}
              placeholder={t("depIdPlaceholder")}
              className="h-10 min-w-0 flex-1 rounded-xl bg-[var(--surface)] px-3.5 text-sm text-white placeholder:text-[var(--subtle)] ring-1 ring-inset ring-white/[0.06] outline-none transition-colors focus:bg-[var(--surface-2)] focus:ring-2 focus:ring-[#1a6dff]/40"
            />
            <div className="w-full shrink-0 sm:w-36">
              <DropdownSelect
                size="sm"
                value={newDepType}
                onChange={onNewDepTypeChange}
                options={[
                  { value: "required", label: t("depRequired") },
                  { value: "optional", label: t("depOptional") },
                  ...(kind !== "hangar"
                    ? [
                        { value: "incompatible" as const, label: t("depIncompatible") },
                        { value: "embedded" as const, label: t("depEmbedded") },
                      ]
                    : []),
                ]}
              />
            </div>
            <button
              type="button"
              onClick={onAddManualDep}
              disabled={!newDepId.trim()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--surface-2)] px-4 text-xs font-medium text-white ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t("addDep")}
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.05] pt-4">
          <FieldLabel htmlFor="descriptionOverride">{t("descriptionOverride")}</FieldLabel>
          <textarea
            id="descriptionOverride"
            rows={2}
            placeholder={t("descriptionOverridePlaceholder")}
            value={descriptionOverride}
            onChange={(e) => onDescriptionOverrideChange(e.target.value)}
            className="w-full resize-none rounded-xl bg-[var(--surface)] px-3.5 py-2.5 text-sm text-white placeholder:text-[var(--subtle)] ring-1 ring-inset ring-white/[0.06] outline-none transition-colors focus:bg-[var(--surface-2)] focus:ring-2 focus:ring-[#1a6dff]/40"
          />
        </div>
      </div>
    </div>
  );
}
