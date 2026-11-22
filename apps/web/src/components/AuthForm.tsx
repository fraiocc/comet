"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { AuthAtmosphereShader } from "@/components/AuthAtmosphereShader";
import { Button, LinkButton } from "@/components/ui/Button";
import { CometLogo } from "@/components/ui/CometLogo";
import { FieldLabel } from "@/components/ui/Field";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { GitHubIcon } from "@/components/ui/Icons";

interface AuthFormProps {
  mode: "login" | "register";
  initialError?: string | null;
}

interface AuthFieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function inputClass(hasError: boolean): string {
  return [
    "h-11 w-full rounded-xl bg-[var(--surface)] px-4 text-sm text-white placeholder:text-[var(--subtle)] ring-1 ring-inset outline-none transition-colors duration-150 focus:bg-[var(--surface-2)] focus:ring-2",
    hasError
      ? "ring-rose-500/50 focus:ring-rose-400/60"
      : "ring-white/[0.07] focus:ring-[#1a6dff]/45",
  ].join(" ");
}

export function AuthForm({ mode, initialError }: AuthFormProps) {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const tVal = useTranslations("validation");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(
    initialError === "github_not_configured" ? t("githubNotConfigured") : initialError ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  function validate(): AuthFieldErrors {
    const next: AuthFieldErrors = {};
    if (mode === "register") {
      if (!username.trim()) {
        next.username = tVal("required");
      } else if (username.trim().length < 2) {
        next.username = tVal("minUsername");
      }
    }
    if (!email.trim()) {
      next.email = tVal("required");
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = tVal("invalidEmail");
    }
    if (!password) {
      next.password = tVal("required");
    } else if (password.length < 8) {
      next.password = tVal("minPassword");
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { username: username.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) {
        setError(data.error ?? "Authentication failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[var(--bg)] lg:grid-cols-12">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:col-span-5 lg:px-14">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-90"
        >
          <CometLogo size={30} />
          <span>{tApp("name")}</span>
        </Link>

        <div className="animate-fade-up mx-auto my-12 w-full max-w-[390px]">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {mode === "register" ? t("registerTitle") : t("loginTitle")}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
            {mode === "register" ? t("registerSubtitle") : t("loginSubtitle")}
          </p>

          <FormAlert message={error} className="mt-6" />

          <div className="mt-7">
            <LinkButton
              href="/api/auth/github"
              external
              variant="secondary"
              size="md"
              className="h-11 w-full rounded-xl ring-1 ring-inset ring-white/[0.08]"
            >
              <GitHubIcon className="h-4.5 w-4.5" />
              {t("continueWithGithub")}
            </LinkButton>
          </div>

          <div className="my-6 flex items-center gap-3.5 text-xs text-[var(--subtle)]">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span>{t("orContinueWith")}</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === "register" && (
              <div>
                <FieldLabel htmlFor="username">{t("username")}</FieldLabel>
                <input
                  id="username"
                  type="text"
                  placeholder={t("usernamePlaceholder")}
                  value={username}
                  aria-invalid={Boolean(fieldErrors.username)}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  className={inputClass(Boolean(fieldErrors.username))}
                />
                <FieldError message={fieldErrors.username} />
              </div>
            )}

            <div>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                className={inputClass(Boolean(fieldErrors.email))}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <input
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                className={inputClass(Boolean(fieldErrors.password))}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <Button
              type="submit"
              size="md"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-xl"
            >
              {mode === "register" ? t("registerSubmit") : t("signInSubmit")}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-[var(--muted)]">
            {mode === "register" ? (
              <>
                {t("haveAccount")}{" "}
                <Link href="/login" className="font-medium text-white hover:underline">
                  {t("signInSubmit")}
                </Link>
              </>
            ) : (
              <>
                {t("noAccount")}{" "}
                <Link href="/register" className="font-medium text-white hover:underline">
                  {t("registerSubmit")}
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="font-mono text-xs text-[var(--subtle)]">comet-cli · v0.1.0</p>
      </div>

      <div className="hidden p-4 lg:col-span-7 lg:block">
        <AuthAtmosphereShader className="h-full min-h-[640px] w-full rounded-[28px] ring-1 ring-inset ring-white/[0.08]">
          <div className="flex h-full flex-col justify-end p-10 xl:p-14">
            <div className="max-w-md space-y-4">
              <CometLogo size={42} />
              <p className="text-2xl font-semibold leading-snug tracking-tight text-white">
                {tApp("tagline")}
              </p>
              <p className="font-mono text-xs text-white/60">
                GitHub Releases · Modrinth · Hangar
              </p>
            </div>
          </div>
        </AuthAtmosphereShader>
      </div>
    </div>
  );
}
