import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GalaxyFooterShader } from "@/components/GalaxyFooterShader";
import { StarWordmark } from "@/components/StarWordmark";
import { CometLogo } from "@/components/ui/CometLogo";
import { APP_VERSION } from "@/lib/version";

export async function Footer() {
  const t = await getTranslations();

  return (
    <footer className="mt-24">
      <GalaxyFooterShader className="min-h-[340px]">
        <div className="mx-auto flex min-h-[340px] max-w-5xl flex-col justify-between px-6 pb-12 pt-24 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-12">
            <div className="space-y-4 sm:col-span-6">
              <Link href="/" className="inline-flex items-center gap-3">
                <CometLogo size={34} />
                <span className="text-lg font-semibold tracking-tight text-white">
                  {t("app.name")}
                </span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-[#b4b5cb]">
                {t("app.tagline")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:col-span-6 sm:justify-self-end">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  {t("app.name")}
                </p>
                <div className="flex flex-col gap-2.5 text-sm text-[#c4c5da]">
                  <Link href="/download" className="transition-colors hover:text-white">
                    {t("nav.download")}
                  </Link>
                  <Link href="/changelog" className="transition-colors hover:text-white">
                    {t("nav.changelog")}
                  </Link>
                  <Link href="/pricing" className="transition-colors hover:text-white">
                    {t("nav.pricing")}
                  </Link>
                  <Link href="/dashboard" className="transition-colors hover:text-white">
                    {t("nav.dashboard")}
                  </Link>
                  <Link href="/login" className="transition-colors hover:text-white">
                    {t("nav.signIn")}
                  </Link>
                  <Link href="/register" className="transition-colors hover:text-white">
                    {t("nav.register")}
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Platforms
                </p>
                <div className="flex flex-col gap-2.5 text-sm text-[#c4c5da]">
                  <span>GitHub Releases</span>
                  <span>Modrinth</span>
                  <span>Hangar</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6 text-xs text-white/55">
            <span>{t("home.footerNote")}</span>
            <span className="font-mono">comet-cli · v{APP_VERSION}</span>
          </div>

          <StarWordmark text="comet" />
        </div>
      </GalaxyFooterShader>
    </footer>
  );
}
