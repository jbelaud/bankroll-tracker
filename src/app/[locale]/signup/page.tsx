"use client";

import { Suspense, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signUp, signInWithGoogle } from "@/app/auth/actions";
import { useSearchParams } from "next/navigation";

export default function SignupPage() {
  return <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}><SignupForm /></Suspense>;
}

function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const t = useTranslations("auth.signup");
  const invite = useSearchParams().get("invite") ?? "";

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h1 className="text-lg font-semibold text-zinc-100 mb-1">
          {t("title")}
        </h1>
        <p className="text-sm text-zinc-500 mb-5">{t("subtitle")}</p>

        <form action={action} className="space-y-3">
          <input type="hidden" name="invite" value={invite} />
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1.5 font-medium">
              {t("emailLabel")}
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1.5 font-medium">
              {t("passwordLabel")}
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            <p className="mt-1 text-xs text-zinc-600">{t("passwordHint")}</p>
          </div>

          {state?.error && (
            <p className="text-xs text-rose-400">{state.error}</p>
          )}
          {state?.message && (
            <p className="text-xs text-emerald-400">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {pending ? t("submitting") : t("submit")}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-zinc-800 flex-1" />
          <span className="text-xs text-zinc-600">{t("or")}</span>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>

        <form action={signInWithGoogle}>
          <input type="hidden" name="invite" value={invite} />
          <button
            type="submit"
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            {t("google")}
          </button>
        </form>

        <p className="text-sm text-zinc-500 mt-5 text-center">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
