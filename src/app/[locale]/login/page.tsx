"use client";

import { Suspense, useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, LockSimple, Sparkle } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Brand } from "@/components/marketing/brand";
import { signIn, signInWithGoogle } from "@/app/auth/actions";
import { useSearchParams } from "next/navigation";
import { authQueryErrorKey } from "@/lib/auth/error-mapping";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const t = useTranslations("auth.login");
  const tErrors = useTranslations("auth.errors");
  const tMarketing = useTranslations("marketing");
  const queryError = authQueryErrorKey(useSearchParams().get("error"));

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-background px-4 py-5 sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_5%,oklch(0.72_0.14_250_/_16%),transparent_28rem),radial-gradient(circle_at_86%_88%,oklch(0.76_0.14_165_/_10%),transparent_28rem)]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" aria-label={tMarketing("header.homeAriaLabel")} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <Brand className="text-xl" />
        </Link>
        <Link
          href="/signup"
          className="rounded-xl border border-border bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted sm:px-4"
        >
          {t("signupLink")}
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-8 pb-5 pt-10 lg:min-h-[calc(100dvh-5.75rem)] lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 lg:py-12">
        <section className="hidden max-w-xl lg:block">
          <p className="marketing-eyebrow">
            <Sparkle size={15} weight="fill" aria-hidden />
            {tMarketing("hero.eyebrow")}
          </p>
          <h1 className="mt-5 text-balance text-5xl font-semibold tracking-[-0.045em] text-foreground">
            {tMarketing("hero.title")}
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
            {tMarketing("hero.description")}
          </p>

          <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-start gap-2.5">
              <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-profit" aria-hidden />
              <span>{tMarketing("hero.reassuranceOne")}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <LockSimple size={20} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>{tMarketing("hero.reassuranceTwo")}</span>
            </li>
          </ul>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 rounded-3xl border border-border bg-card/80 p-4 shadow-[0_24px_80px_oklch(0.05_0.02_260_/_30%)]">
            <LoginPreviewStat label="Historique" value="Organisé" />
            <LoginPreviewStat label="Import" value="Vérifié" highlight />
            <LoginPreviewStat label="Données" value="Privées" />
          </div>
        </section>

        <section className="w-full rounded-[1.75rem] border border-border bg-card/90 p-5 shadow-[0_24px_80px_oklch(0.05_0.02_260_/_36%)] backdrop-blur sm:p-7">
          <p className="text-sm font-medium text-primary">Kalivoa</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>

          <form action={action} className="mt-7 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-foreground">
                {t("emailLabel")}
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="login-password" className="block text-sm font-medium text-foreground">{t("passwordLabel")}</label><Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">{t("forgotPassword")}</Link></div>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>

            {state?.error && (
              <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm leading-5 text-loss">
                {state.error}
              </p>
            )}
            {!state?.error && queryError && (
              <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm leading-5 text-loss">
                {tErrors(queryError)}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_oklch(0.72_0.14_250_/_24%)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("or")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-muted"
            >
              <GoogleMark />
              {t("google")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")} {" "}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
              {t("signupLink")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function LoginPreviewStat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-background/70 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={highlight ? "mt-1 text-sm font-semibold text-profit" : "mt-1 text-sm font-semibold text-foreground"}>{value}</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M21.8 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.51h3.3c1.93-1.77 3.04-4.39 3.04-7.42Z" />
      <path fill="#34A853" d="M12 22c2.75 0 5.06-.91 6.75-2.35l-3.3-2.51c-.91.61-2.08.97-3.45.97-2.65 0-4.9-1.79-5.71-4.2H2.88v2.59A10.2 10.2 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.29 13.91A6.15 6.15 0 0 1 6 12c0-.66.11-1.3.29-1.91V7.5H2.88A10 10 0 0 0 1.8 12c0 1.61.39 3.14 1.08 4.5l3.41-2.59Z" />
      <path fill="#EA4335" d="M12 5.89c1.5 0 2.85.52 3.91 1.54l2.93-2.93C17.06 2.84 14.75 2 12 2A10.2 10.2 0 0 0 2.88 7.5l3.41 2.59C7.1 7.68 9.35 5.89 12 5.89Z" />
    </svg>
  );
}
