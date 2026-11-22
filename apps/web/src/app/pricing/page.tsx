import { getTranslations } from "next-intl/server";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { LinkButton } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  CheckIcon,
  ExternalLinkIcon,
  GitHubIcon,
} from "@/components/ui/Icons";
import { getSessionUser } from "@/lib/auth";

const GITHUB_REPO_URL =
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/fraiocc/comet";
const GITHUB_SPONSORS_URL =
  process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL ?? "https://github.com/sponsors/fraiocc";

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const user = await getSessionUser();

  const features = [
    t("feature1"),
    t("feature2"),
    t("feature3"),
    t("feature4"),
    t("feature5"),
    t("feature6"),
  ];

  const supportWays = [
    { title: t("supportWay1Title"), desc: t("supportWay1Desc") },
    { title: t("supportWay2Title"), desc: t("supportWay2Desc") },
    { title: t("supportWay3Title"), desc: t("supportWay3Desc") },
  ];

  const faqs = [
    { title: t("faq1Title"), desc: t("faq1Desc") },
    { title: t("faq2Title"), desc: t("faq2Desc") },
    { title: t("faq3Title"), desc: t("faq3Desc") },
  ];

  return (
    <div className="min-h-screen">
      <Navbar username={user?.username} />

      <main className="mx-auto max-w-5xl px-6 sm:px-8">
        <section className="animate-fade-up pb-14 pt-16 sm:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[54px]">
              {t("title")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              {t("subtitle")}
            </p>
          </div>
        </section>

        <section className="animate-fade-up-delay-1 grid gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-[28px] bg-[#121116] p-8 ring-1 ring-inset ring-white/[0.08] sm:p-10 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">{t("planName")}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a6dff]/15 px-3 py-1 text-xs font-medium text-[#9cc4ff]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a6dff]" />
                  {t("planBadge")}
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-2.5">
                <span className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  {t("price")}
                </span>
                <span className="text-sm text-[var(--muted)]">{t("pricePeriod")}</span>
              </div>

              <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
                {t("planDesc")}
              </p>

              <ul className="mt-8 grid gap-3.5 border-t border-white/[0.06] pt-7 sm:grid-cols-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-[#d6d7e6]">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#1a6dff]/20 text-[#9cc4ff]">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton
                href={user ? "/dashboard" : "/register"}
                variant="primary"
                size="lg"
              >
                {user ? t("ctaDashboard") : t("ctaStart")}
                <ArrowRightIcon />
              </LinkButton>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[28px] bg-[#121116] p-8 ring-1 ring-inset ring-white/[0.06] sm:p-10 lg:col-span-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg)]/80 text-white">
                  <GitHubIcon className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {t("supportTitle")}
                </h2>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                {t("supportSubtitle")}
              </p>

              <div className="mt-6 space-y-2.5">
                {supportWays.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl bg-[var(--bg)]/55 px-4 py-3.5"
                  >
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
              <LinkButton
                href={GITHUB_SPONSORS_URL}
                external
                target="_blank"
                rel="noreferrer"
                variant="secondary"
                size="md"
                className="flex-1"
              >
                <GitHubIcon className="h-4 w-4" />
                {t("sponsorCta")}
              </LinkButton>
              <LinkButton
                href={GITHUB_REPO_URL}
                external
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                size="md"
                className="flex-1"
              >
                {t("githubCta")}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </LinkButton>
            </div>
          </div>
        </section>

        <section className="mt-20 border-y border-white/[0.06] py-14">
          <div className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-white/[0.06]">
            {faqs.map((item, idx) => (
              <div
                key={item.title}
                className={
                  idx === 0 ? "md:pr-10" : idx === 1 ? "md:px-10" : "md:pl-10"
                }
              >
                <h3 className="text-base font-semibold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
