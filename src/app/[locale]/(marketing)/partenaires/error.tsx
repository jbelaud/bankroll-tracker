"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ unstable_retry }: { unstable_retry: () => void }) {
  const t = useTranslations("partners");
  return <section className="kalivoa-content-frame py-12" role="alert">
    <h1 className="text-2xl font-semibold">{t("errorTitle")}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{t("errorDescription")}</p>
    <Button onClick={unstable_retry} className="mt-6 min-h-11 rounded-lg px-4">{t("retry")}</Button>
  </section>;
}
