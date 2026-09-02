"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/app/auth/actions";
import { Brand } from "@/components/marketing/brand";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  const t = useTranslations("auth.passwordReset");
  return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
      <Brand className="text-xl" />
      <h1 className="mt-6 text-2xl font-semibold">{t("requestTitle")}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("requestDescription")}</p>
      <form action={action} className="mt-6 space-y-4">
        <div><label htmlFor="reset-email" className="mb-2 block text-sm font-medium">{t("emailLabel")}</label><input id="reset-email" name="email" type="email" autoComplete="email" required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></div>
        {state?.error ? <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 p-3 text-sm text-loss">{state.error}</p> : null}
        {state?.message ? <p role="status" className="rounded-xl border border-profit/30 bg-profit/10 p-3 text-sm text-profit">{state.message}</p> : null}
        <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? t("sending") : t("send")}</button>
      </form>
      <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-primary hover:underline">{t("backToLogin")}</Link>
    </section>
  </main>;
}
