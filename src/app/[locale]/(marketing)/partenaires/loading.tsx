import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("partners");
  return <div className="kalivoa-content-frame py-12" role="status" aria-busy="true">
    <p className="text-sm text-muted-foreground">{t("loading")}</p>
    <div aria-hidden className="mt-6 space-y-4 motion-safe:animate-pulse">
      <div className="h-10 w-3/4 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2"><div className="h-64 rounded-xl bg-muted" /><div className="h-64 rounded-xl bg-muted" /></div>
    </div>
  </div>;
}
