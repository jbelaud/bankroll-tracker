"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword } from "@/app/auth/actions";
import { Brand } from "@/components/marketing/brand";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  const t = useTranslations("auth.passwordReset");
  return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
      <Brand className="text-xl" />
      <h1 className="mt-6 text-2xl font-semibold">{t("changeTitle")}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("changeDescription")}</p>
      <form action={action} className="mt-6 space-y-4">
        <div><label htmlFor="new-password" className="mb-2 block text-sm font-medium">{t("newPassword")}</label><input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></div>
        <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">{t("confirmation")}</label><input id="confirm-password" name="confirmation" type="password" minLength={8} autoComplete="new-password" required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></div>
        {state?.error ? <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 p-3 text-sm text-loss">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? t("saving") : t("save")}</button>
      </form>
    </section>
  </main>;
}
