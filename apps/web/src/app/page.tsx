import { getTranslations } from "next-intl/server";

import { CometSkyShader } from "@/components/CometSkyShader";
import { CtaBanner } from "@/components/CtaBanner";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TerminalPreview } from "@/components/TerminalPreview";
import { LinkButton } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const t = await getTranslations("home");
  const user = await getSessionUser();

  return (
    <div className="min-h-screen overflow-x-clip">
      <Navbar username={user?.username} />

      <CometSkyShader className="-mt-20 min-h-[82vh] sm:min-h-[88vh]">
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-44">
          <div className="animate-fade-up mx-auto max-w-3xl text-center">
            <h1 className="text-[36px] font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[68px]">
              {t("title")}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#c6c7dc] sm:mt-6 sm:text-xl">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center sm:gap-3.5">
              {user ? (
                <LinkButton href="/dashboard" variant="primary" size="lg">
                  {t("ctaPrimary")}
                  <ArrowRightIcon />
                </LinkButton>
              ) : (
                <>
                  <LinkButton href="/register" variant="primary" size="lg">
                    {t("ctaRegister")}
                    <ArrowRightIcon />
                  </LinkButton>
                  <LinkButton
                    href="/login"
                    variant="secondary"
                    size="lg"
                    className="bg-[#12121d]/75 backdrop-blur-xl"
                  >
                    {t("ctaSignIn")}
                  </LinkButton>
                </>
              )}
            </div>
          </div>

          <div className="animate-fade-up-delay-1 mt-16">
            <TerminalPreview
              command={t("cliSnippet")}
              line1={t("cliLine1")}
              line2={t("cliLine2")}
              line3={t("cliLine3")}
            />
          </div>
        </section>
      </CometSkyShader>

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <section className="mt-14 border-y border-white/[0.06] py-10 sm:mt-20 sm:py-14">
          <div className="grid divide-y divide-white/[0.06] md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="pb-8 md:pb-0 md:pr-10">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {t("step1Title")}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                {t("step1Desc")}
              </p>
            </div>

            <div className="py-8 md:px-10 md:py-0">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {t("step2Title")}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                {t("step2Desc")}
              </p>
            </div>

            <div className="pt-8 md:pl-10 md:pt-0">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {t("step3Title")}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                {t("step3Desc")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 grid items-center gap-10 sm:mt-24 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 space-y-6 lg:col-span-5">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              {t("ciTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {t("ciSubtitle")}
            </p>

            <div className="space-y-3 pt-2 text-sm text-[var(--muted)]">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <span className="font-medium text-white">{t("platform1Title")}</span>
                <span className="font-mono text-xs text-[var(--subtle)]">Public & Private</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <span className="font-medium text-white">{t("platform2Title")}</span>
                <span className="font-mono text-xs text-[var(--subtle)]">Mods & Plugins</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="font-medium text-white">{t("platform3Title")}</span>
                <span className="font-mono text-xs text-[var(--subtle)]">Paper & Velocity</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="overflow-hidden rounded-2xl bg-[#0e0e14] ring-1 ring-inset ring-white/[0.06] sm:rounded-3xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3 sm:px-6 sm:py-3.5">
                <span className="truncate font-mono text-xs text-[var(--muted)]">
                  .github/workflows/release.yml
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[var(--subtle)]">
                  GitHub Actions
                </span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 sm:p-7 sm:text-[13px]">
                <code>
                  <span className="text-[#9cc4ff]">name</span>
                  <span className="text-[var(--subtle)]">:</span>{" "}
                  <span className="text-white">Publish Release</span>
                  {"\n"}
                  <span className="text-[#9cc4ff]">on</span>
                  <span className="text-[var(--subtle)]">:</span>
                  {"\n  "}
                  <span className="text-[#9cc4ff]">release</span>
                  <span className="text-[var(--subtle)]">:</span>
                  {"\n    "}
                  <span className="text-[#9cc4ff]">types</span>
                  <span className="text-[var(--subtle)]">:</span>{" "}
                  <span className="text-[#6ee7b7]">[published]</span>
                  {"\n\n"}
                  <span className="text-[#9cc4ff]">jobs</span>
                  <span className="text-[var(--subtle)]">:</span>
                  {"\n  "}
                  <span className="text-[#9cc4ff]">comet</span>
                  <span className="text-[var(--subtle)]">:</span>
                  {"\n    "}
                  <span className="text-[#9cc4ff]">runs-on</span>
                  <span className="text-[var(--subtle)]">:</span>{" "}
                  <span className="text-white">ubuntu-latest</span>
                  {"\n    "}
                  <span className="text-[#9cc4ff]">steps</span>
                  <span className="text-[var(--subtle)]">:</span>
                  {"\n      - "}
                  <span className="text-[#9cc4ff]">uses</span>
                  <span className="text-[var(--subtle)]">:</span>{" "}
                  <span className="text-[#cdeaff]">fraiocc/comet@v1</span>
                  {"\n        "}
                  <span className="text-[#9cc4ff]">with</span>
                  <span className="text-[var(--subtle)]">:</span>
                  {"\n          "}
                  <span className="text-[#9cc4ff]">comet-token</span>
                  <span className="text-[var(--subtle)]">:</span>{" "}
                  <span className="text-[#a070ff]">{"${{ secrets.COMET_TOKEN }}"}</span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        <CtaBanner
          isSignedIn={Boolean(user)}
          title={t("ctaBannerTitle")}
          subtitle={t("ctaBannerSubtitle")}
          primaryLabel={t("ctaPrimary")}
          registerLabel={t("ctaRegister")}
          signInLabel={t("ctaSignIn")}
        />
      </main>

      <Footer />
    </div>
  );
}
