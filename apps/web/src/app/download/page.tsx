import { getTranslations } from "next-intl/server";

import { DownloadInstallPanel } from "@/components/DownloadInstallPanel";
import { DownloadSkyShader } from "@/components/DownloadSkyShader";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { LinkButton } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { getSessionUser } from "@/lib/auth";

const GITHUB_REPO_URL =
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/fraiocc/comet";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://comet.fraio.cc";

export default async function DownloadPage() {
  const t = await getTranslations("download");
  const user = await getSessionUser();
  const baseUrl = SITE_URL;

  const steps = [
    {
      num: "01",
      title: t("step1Title"),
      desc: t("step1Desc"),
      command: "comet --version",
    },
    {
      num: "02",
      title: t("step2Title"),
      desc: t("step2Desc"),
      command: "comet login",
    },
    {
      num: "03",
      title: t("step3Title"),
      desc: t("step3Desc"),
      command: "comet",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar username={user?.username} />

      <DownloadSkyShader className="-mt-20 min-h-[420px]">
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-36 sm:px-8 sm:pt-44">
          <div className="animate-fade-up mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[58px]">
              {t("title")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#c6c7dc] sm:text-lg">
              {t("subtitle")}
            </p>
          </div>
        </section>
      </DownloadSkyShader>

      <main className="mx-auto max-w-4xl px-6 sm:px-8">
        <section className="animate-fade-up-delay-1 -mt-6">
          <DownloadInstallPanel baseUrl={baseUrl} repoUrl={GITHUB_REPO_URL} />
        </section>

        <section className="mt-20 border-y border-white/[0.06] py-14">
          <h2 className="text-lg font-semibold tracking-tight text-white">{t("nextTitle")}</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="space-y-3">
                <span className="font-mono text-xs font-medium text-[#9cc4ff]">{step.num}</span>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">{step.desc}</p>
                <CopyField
                  value={step.command}
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 flex justify-center">
          <LinkButton
            href={user ? "/dashboard" : "/register"}
            variant="primary"
            size="lg"
          >
            {user ? t("dashboardCta") : t("registerCta")}
            <ArrowRightIcon />
          </LinkButton>
        </section>
      </main>

      <Footer />
    </div>
  );
}
