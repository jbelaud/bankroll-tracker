"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({ unstable_retry }: { unstable_retry: () => void }) {
  const t = useTranslations("partners");
  return <section className="rounded-2xl border border-border bg-card p-6" role="alert"><h1 className="text-xl font-semibold">{t("errorTitle")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("errorDescription")}</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={unstable_retry}>{t("retry")}</Button><Link href="/login" className="inline-flex min-h-11 items-center px-3 text-sm text-primary">{t("member.signIn")}</Link></div></section>;
}
