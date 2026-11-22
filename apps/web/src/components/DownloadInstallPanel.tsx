"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CheckIcon, ExternalLinkIcon, TerminalIcon } from "@/components/ui/Icons";
import { APP_VERSION } from "@/lib/version";

type ShellTab = "powershell" | "cmd" | "unix" | "cargo";

interface DownloadInstallPanelProps {
  baseUrl: string;
  repoUrl: string;
}

export function DownloadInstallPanel({ baseUrl, repoUrl }: DownloadInstallPanelProps) {
  const t = useTranslations("download");
  const [activeTab, setActiveTab] = useState<ShellTab>("powershell");
  const [copied, setCopied] = useState(false);

  const normalizedBase = baseUrl.replace(/\/+$/, "");

  const commands: Record<
    ShellTab,
    { label: string; command: string; hint: string; scriptHref?: string }
  > = {
    powershell: {
      label: t("tabPowershell"),
      command: `irm ${normalizedBase}/install.ps1 | iex`,
      hint: t("psHint"),
      scriptHref: "/install.ps1",
    },
    cmd: {
      label: t("tabCmd"),
      command: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${normalizedBase}/install.ps1 | iex"`,
      hint: t("cmdHint"),
      scriptHref: "/install.cmd",
    },
    unix: {
      label: t("tabUnix"),
      command: `curl -fsSL ${normalizedBase}/install.sh | sh`,
      hint: t("unixHint"),
      scriptHref: "/install.sh",
    },
    cargo: {
      label: t("tabCargo"),
      command: `cargo install --git ${repoUrl} comet-cli`,
      hint: t("cargoHint"),
    },
  };

  const current = commands[activeTab];

  async function handleCopy() {
    await navigator.clipboard.writeText(current.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-[28px] bg-[#121116] ring-1 ring-inset ring-white/[0.08]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["powershell", "cmd", "unix", "cargo"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setCopied(false);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-[#1a6dff] text-white"
                    : "text-[var(--muted)] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {commands[tab].label}
              </button>
            );
          })}
        </div>

        <span className="hidden items-center gap-1.5 font-mono text-xs text-[var(--subtle)] sm:inline-flex">
          <TerminalIcon className="h-3.5 w-3.5" />
          comet-cli v{APP_VERSION}
        </span>
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--bg)]/85 p-3.5 ring-1 ring-inset ring-white/[0.06] sm:flex-row sm:items-center sm:py-3 sm:pl-5 sm:pr-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto">
            <span className="shrink-0 select-none font-mono text-xs text-[#9cc4ff]">
              {activeTab === "powershell" ? "PS>" : activeTab === "cmd" ? ">" : "$"}
            </span>
            <code className="whitespace-nowrap font-mono text-xs text-white sm:text-sm">
              {current.command}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1a6dff] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#145ee6] sm:rounded-full cursor-pointer"
          >
            {copied && <CheckIcon className="h-3.5 w-3.5" />}
            <span>{copied ? t("copied") : t("copy")}</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <p className="leading-relaxed">{current.hint}</p>
          {current.scriptHref && (
            <a
              href={current.scriptHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 font-mono text-[var(--accent)] transition-colors hover:text-white"
            >
              <span>
                {t("scriptDirectLabel")} ({current.scriptHref})
              </span>
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
