import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("partners");
  return <div className="space-y-5" role="status" aria-busy="true">
    <p className="text-sm text-muted-foreground">{t("loading")}</p>
    <div aria-hidden className="space-y-5 motion-safe:animate-pulse"><div className="h-72 rounded-3xl bg-muted" /><div className="grid gap-4 md:grid-cols-2"><div className="h-96 rounded-2xl bg-muted" /><div className="h-96 rounded-2xl bg-muted" /></div></div>
  </div>;
}
