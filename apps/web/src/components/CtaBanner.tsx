import { AuroraHorizonShader } from "@/components/AuroraHorizonShader";
import { LinkButton } from "@/components/ui/Button";
import { CometLogo } from "@/components/ui/CometLogo";
import { ArrowRightIcon } from "@/components/ui/Icons";

interface CtaBannerProps {
  isSignedIn: boolean;
  title: string;
  subtitle: string;
  primaryLabel: string;
  registerLabel: string;
  signInLabel: string;
}

export function CtaBanner({
  isSignedIn,
  title,
  subtitle,
  primaryLabel,
  registerLabel,
  signInLabel,
}: CtaBannerProps) {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="overflow-hidden rounded-[24px] ring-1 ring-inset ring-white/[0.08] sm:rounded-[32px]">
        <AuroraHorizonShader>
          <div className="flex flex-col items-center px-6 py-12 text-center sm:px-8 sm:py-20">
            <CometLogo size={52} />
            <h2 className="mt-5 max-w-xl text-2xl font-semibold tracking-tight text-white sm:mt-6 sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#c6c8de] sm:mt-3.5 sm:text-base">
              {subtitle}
            </p>
            <div className="mt-7 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:items-center sm:gap-3.5">
              {isSignedIn ? (
                <LinkButton href="/dashboard" variant="primary" size="lg">
                  {primaryLabel}
                  <ArrowRightIcon />
                </LinkButton>
              ) : (
                <>
                  <LinkButton href="/register" variant="primary" size="lg">
                    {registerLabel}
                    <ArrowRightIcon />
                  </LinkButton>
                  <LinkButton
                    href="/login"
                    variant="secondary"
                    size="lg"
                    className="bg-[#0e0f1a]/75 backdrop-blur-xl"
                  >
                    {signInLabel}
                  </LinkButton>
                </>
              )}
            </div>
          </div>
        </AuroraHorizonShader>
      </div>
    </section>
  );
}
