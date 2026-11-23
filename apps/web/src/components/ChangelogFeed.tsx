"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { GlobeIcon, TerminalIcon } from "@/components/ui/Icons";

export interface ChangelogRelease {
  id: string;
  product: "cli" | "web";
  version: string;
  date: string;
  month: string;
  year: string;
  title: string;
  summary: string;
  features: { title: string; desc: string }[];
}

interface ChangelogFeedProps {
  releases: ChangelogRelease[];
}

type ProductFilter = "all" | "cli" | "web";

export function ChangelogFeed({ releases }: ChangelogFeedProps) {
  const t = useTranslations("changelog");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [yearOpen, setYearOpen] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return releases;
    return releases.filter((r) => r.product === filter);
  }, [releases, filter]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    const list: { month: string; year: string; firstId: string }[] = [];
    for (const rel of filtered) {
      const key = `${rel.year}-${rel.month}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ month: rel.month, year: rel.year, firstId: rel.id });
      }
    }
    return list;
  }, [filtered]);

  const activeMonth = selectedMonth && months.some((m) => m.month === selectedMonth)
    ? selectedMonth
    : (months[0]?.month ?? null);

  function handleMonthClick(month: string, targetId: string) {
    setSelectedMonth(month);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="lg:sticky lg:top-28">
          <button
            type="button"
            onClick={() => setYearOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-white cursor-pointer"
          >
            <span>{months[0]?.year ?? "2026"}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-3.5 w-3.5 text-[var(--muted)] transition-transform duration-150 ${
                yearOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {yearOpen && months.length > 0 && (
            <ul className="mt-5 space-y-3.5">
              {months.map((m) => {
                const isActive = activeMonth === m.month;
                return (
                  <li key={`${m.year}-${m.month}`}>
                    <button
                      type="button"
                      onClick={() => handleMonthClick(m.month, m.firstId)}
                      className={`group flex items-center gap-3 text-sm transition-colors cursor-pointer ${
                        isActive ? "font-medium text-white" : "text-[var(--subtle)] hover:text-white"
                      }`}
                    >
                      <span className="flex w-2 items-center justify-center">
                        {isActive ? (
                          <span className="h-5 w-1 rounded-full bg-white" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-white/20 transition-colors group-hover:bg-white/60" />
                        )}
                      </span>
                      <span>{m.month}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="lg:col-span-9">
        <div className="flex items-center gap-1 border-b border-white/[0.06]">
          {(
            [
              {
                id: "all" as const,
                label: t("filterAll"),
                count: releases.length,
                icon: null,
              },
              {
                id: "cli" as const,
                label: t("filterCli"),
                count: releases.filter((r) => r.product === "cli").length,
                icon: <TerminalIcon className="h-4 w-4" />,
              },
              {
                id: "web" as const,
                label: t("filterWeb"),
                count: releases.filter((r) => r.product === "web").length,
                icon: <GlobeIcon className="h-4 w-4" />,
              },
            ]
          ).map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  isActive ? "text-white" : "text-[var(--muted)] hover:text-white"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-[#1a6dff]/20 text-[#9cc4ff]"
                      : "bg-white/[0.05] text-[var(--subtle)]"
                  }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#1a6dff]" />
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 text-sm text-[var(--muted)]">{t("emptyFilter")}</p>
        ) : (
          <div className="mt-12 divide-y divide-white/[0.07]">
            {filtered.map((release, idx) => (
              <article
                key={release.id}
                id={release.id}
                className={`scroll-mt-28 ${idx === 0 ? "pb-14" : "py-14"}`}
              >
                <p className="text-sm text-[var(--subtle)]">{release.date}</p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {release.title}
                </h2>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/[0.16]">
                    {release.product === "cli" ? (
                      <TerminalIcon className="h-3.5 w-3.5 text-[#9cc4ff]" />
                    ) : (
                      <GlobeIcon className="h-3.5 w-3.5 text-[#9cc4ff]" />
                    )}
                    <span>{release.product === "cli" ? t("filterCli") : t("filterWeb")}</span>
                  </span>

                  <span className="inline-flex items-center rounded-full px-3 py-1 font-mono text-xs text-[var(--muted)] ring-1 ring-inset ring-white/[0.1]">
                    {release.version}
                  </span>
                </div>

                <p className="mt-6 max-w-2xl text-base italic leading-relaxed text-[#d6d7e6]">
                  {release.summary}
                </p>

                <div className="mt-9 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                  {release.features.map((feat) => (
                    <div key={feat.title}>
                      <h3 className="text-base font-semibold tracking-tight text-white">
                        {feat.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                        {feat.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
