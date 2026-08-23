"use client";

import { Suspense, useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, LockSimple, Sparkle } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Brand } from "@/components/marketing/brand";
import { signInWithGoogle, signUp } from "@/app/auth/actions";

export function SignupForm({ betaPhaseActive }: { betaPhaseActive: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}>
      <SignupFormContent betaPhaseActive={betaPhaseActive} />
    </Suspense>
  );
}

function SignupFormContent({ betaPhaseActive }: { betaPhaseActive: boolean }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  const t = useTranslations("auth.signup");
  const tMarketing = useTranslations("marketing");
  const invite = useSearchParams().get("invite") ?? "";
  const referral = useSearchParams().get("ref") ?? "";
  const signupEmailRateLimited = Boolean(state && "errorCode" in state && state.errorCode === "signupEmailRateLimited");
  const offer = betaPhaseActive ? "beta" : "standard";

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-background px-4 py-5 sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_86%_8%,oklch(0.72_0.14_250_/_15%),transparent_29rem),radial-gradient(circle_at_14%_88%,oklch(0.76_0.14_165_/_11%),transparent_27rem)]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" aria-label={tMarketing("header.homeAriaLabel")} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <Brand className="text-xl" />
        </Link>
        <Link href="/login" className="rounded-xl border border-border bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted sm:px-4">
          {t("loginLink")}
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-8 pb-5 pt-10 lg:min-h-[calc(100dvh-5.75rem)] lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-16 lg:py-12">
        <section className="order-2 hidden max-w-xl lg:order-1 lg:block">
          <SignupPreview />
          <ul className="mt-7 grid gap-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5"><CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-profit" aria-hidden /><span>{t(`freemium.${offer}BenefitBankroll`)}</span></li>
            <li className="flex items-start gap-2.5"><CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-profit" aria-hidden /><span>{t(`freemium.${offer}BenefitScans`)}</span></li>
            <li className="flex items-start gap-2.5"><LockSimple size={20} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden /><span>{t("freemium.benefitFeatures")}</span></li>
          </ul>
        </section>

        <section className="order-1 w-full rounded-[1.75rem] border border-border bg-card/90 p-5 shadow-[0_24px_80px_oklch(0.05_0.02_260_/_36%)] backdrop-blur sm:p-7 lg:order-2">
          <p className="marketing-eyebrow w-fit"><Sparkle size={15} weight="fill" aria-hidden />{t(`freemium.${offer}Eyebrow`)}</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`freemium.${offer}Description`)}</p>

          <form action={signInWithGoogle} className="mt-6">
            <input type="hidden" name="invite" value={invite} />
            <input type="hidden" name="referral" value={referral} />
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-muted">
              <GoogleMark />{t("google")}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">{t("or")}</span><div className="h-px flex-1 bg-border" /></div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="invite" value={invite} />
            <input type="hidden" name="referral" value={referral} />
            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-foreground">{t("emailLabel")}</label>
              <input id="signup-email" type="email" name="email" autoComplete="email" required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15" />
            </div>
            <div>
              <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-foreground">{t("passwordLabel")}</label>
              <input id="signup-password" type="password" name="password" autoComplete="new-password" required minLength={8} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15" />
              <p className="mt-2 text-xs text-muted-foreground">{t("passwordHint")}</p>
            </div>

            {state?.error && <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm leading-5 text-loss">{state.error}</p>}
            {state?.message && <p role="status" className="rounded-xl border border-profit/30 bg-profit/10 px-3 py-2.5 text-sm leading-5 text-profit">{state.message}</p>}

            <button type="submit" disabled={pending || signupEmailRateLimited} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_oklch(0.72_0.14_250_/_24%)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">{t("freemium.noCard")}</p>
          <p className="mt-5 text-center text-sm text-muted-foreground">{t("hasAccount")} {" "}<Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">{t("loginLink")}</Link></p>
        </section>
      </main>
    </div>
  );
}

function SignupPreview() {
  const t = useTranslations("auth.signup");
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[linear-gradient(135deg,oklch(0.27_0.04_260),oklch(0.19_0.025_255))] p-4 shadow-[0_24px_80px_oklch(0.05_0.02_260_/_30%)] sm:p-5">
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-3"><span className="size-2 rounded-full bg-loss/80" /><span className="size-2 rounded-full bg-warning/80" /><span className="size-2 rounded-full bg-profit/80" /><span className="ml-2 text-[10px] text-muted-foreground">bettrack.app</span></div>
      <div className="grid grid-cols-3 gap-2 pt-4"><PreviewMetric label={t("freemium.preview.bets")} value="24" /><PreviewMetric label={t("freemium.preview.roi")} value="+12,4 %" positive /><PreviewMetric label={t("freemium.preview.profit")} value="+84,70 €" positive /></div>
      <div className="mt-3 rounded-xl border border-white/10 bg-background/30 p-3"><div className="flex h-16 items-end gap-1.5" aria-hidden>{[24, 31, 27, 41, 37, 52, 47, 63, 58, 71, 76, 88].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-primary/70" style={{ height: `${height}%` }} />)}</div></div>
      <div className="mt-3 space-y-2"><PreviewBet name="Football · Résultat du match" value="+12,50 €" /><PreviewBet name="Tennis · Vainqueur" value="+8,20 €" /></div>
    </div>
  );
}

function PreviewMetric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return <div className="rounded-xl border border-white/10 bg-background/25 p-2.5"><p className="text-[10px] text-muted-foreground">{label}</p><p className={positive ? "mt-1 text-sm font-semibold text-profit" : "mt-1 text-sm font-semibold text-foreground"}>{value}</p></div>;
}

function PreviewBet({ name, value }: { name: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/20 px-3 py-2 text-xs"><span className="truncate text-muted-foreground">{name}</span><span className="shrink-0 font-semibold text-profit">{value}</span></div>;
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden><path fill="#4285F4" d="M21.8 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.51h3.3c1.93-1.77 3.04-4.39 3.04-7.42Z" /><path fill="#34A853" d="M12 22c2.75 0 5.06-.91 6.75-2.35l-3.3-2.51c-.91.61-2.08.97-3.45.97-2.65 0-4.9-1.79-5.71-4.2H2.88v2.59A10.2 10.2 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.29 13.91A6.15 6.15 0 0 1 6 12c0-.66.11-1.3.29-1.91V7.5H2.88A10 10 0 0 0 1.8 12c0 1.61.39 3.14 1.08 4.5l3.41-2.59Z" /><path fill="#EA4335" d="M12 5.89c1.5 0 2.85.52 3.91 1.54l2.93-2.93C17.06 2.84 14.75 2 12 2A10.2 10.2 0 0 0 2.88 7.5l3.41 2.59C7.1 7.68 9.35 5.89 12 5.89Z" /></svg>;
}
