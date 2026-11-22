"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CopyField } from "@/components/ui/CopyField";
import { FieldLabel } from "@/components/ui/Field";
import { KeyIcon, TrashIcon } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";

interface CliTokenItem {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CliTokensModalProps {
  open: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CliTokensModal({ open, onClose }: CliTokensModalProps) {
  const t = useTranslations("dashboard");
  const [tokens, setTokens] = useState<CliTokenItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawToken, setNewRawToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadTokens() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/cli/tokens");
        const data = (await resp.json().catch(() => ({}))) as {
          tokens?: CliTokenItem[];
        };
        if (!cancelled && resp.ok && data.tokens) {
          setTokens(data.tokens);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTokens();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const label = tokenName.trim() || "Personal CLI";
      const resp = await fetch("/api/cli/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: label }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };
      if (!resp.ok || !data.token) {
        setError(data.error ?? "Failed to create token");
        return;
      }

      setNewRawToken(data.token);
      setTokenName("");

      const listResp = await fetch("/api/cli/tokens");
      const listData = (await listResp.json().catch(() => ({}))) as {
        tokens?: CliTokenItem[];
      };
      if (listResp.ok && listData.tokens) {
        setTokens(listData.tokens);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    setRevokingId(id);
    try {
      const resp = await fetch(`/api/cli/tokens/${id}`, { method: "DELETE" });
      if (!resp.ok) {
        setError("Failed to revoke token");
        return;
      }
      setTokens((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setRevokingId(null);
    }
  }

  function handleClose() {
    setNewRawToken(null);
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("cliTokenTitle")}
      subtitle={t("cliTokenSubtitle")}
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="space-y-4 rounded-2xl bg-[var(--bg)]/55 p-5">
          <form onSubmit={handleCreateToken} className="space-y-2.5">
            <FieldLabel htmlFor="tokenName">{t("tokenNameLabel")}</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="tokenName"
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder={t("tokenNamePlaceholder")}
                className="h-10 min-w-0 flex-1 rounded-xl bg-[var(--surface)] px-3.5 text-sm text-white placeholder:text-[var(--subtle)] ring-1 ring-inset ring-white/[0.06] outline-none transition-colors focus:bg-[var(--surface-2)] focus:ring-2 focus:ring-[#1a6dff]/40"
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1a6dff] px-4 text-xs font-medium text-white transition-colors hover:bg-[#145ee6] disabled:opacity-45 cursor-pointer"
              >
                <KeyIcon className="h-3.5 w-3.5" />
                <span>{creating ? t("generating") : t("generateToken")}</span>
              </button>
            </div>
          </form>

          {newRawToken && (
            <div className="space-y-2.5 rounded-xl bg-[var(--surface)] p-4 ring-1 ring-inset ring-[#1a6dff]/35">
              <p className="text-xs font-medium text-[#9cc4ff]">
                {t("cliTokenGeneratedHint")}
              </p>
              <CopyField
                value={newRawToken}
                copyLabel={t("copyToken")}
                copiedLabel={t("copied")}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-[var(--bg)]/55 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--muted)]">
              {t("activeTokensTitle")}
            </span>
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
              {tokens.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-1.5">
              <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
              <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-xl bg-[var(--surface)] px-4 py-7 text-center text-sm text-[var(--muted)]">
              {t("noCliTokens")}
            </div>
          ) : (
            <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
              {tokens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3.5 rounded-xl bg-[var(--surface)] px-3.5 py-3 ring-1 ring-inset ring-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg)]/70 text-[#9cc4ff]">
                      <KeyIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{item.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--subtle)]">
                        {t("tokenCreated", { date: formatDate(item.createdAt) })}
                        {item.lastUsedAt
                          ? ` · ${t("tokenLastUsed", { date: formatDate(item.lastUsedAt) })}`
                          : ` · ${t("tokenNeverUsed")}`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    title={t("revokeToken")}
                    aria-label={t("revokeToken")}
                    disabled={revokingId === item.id}
                    onClick={() => handleRevoke(item.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-[#fda4af] disabled:opacity-40 cursor-pointer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
