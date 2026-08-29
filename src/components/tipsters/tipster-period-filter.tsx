import { getTranslations } from "next-intl/server";

export async function TipsterPeriodFilter({ from, to }: { from: string; to: string }) {
  const t = await getTranslations("tipsters.detail.period");
  return (
    <form method="get" className="flex flex-col gap-2 rounded-xl border border-border bg-card/45 p-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
        {t("from")}
        <input name="from" type="date" defaultValue={from} className="h-10 rounded-lg border border-input bg-background px-3 text-foreground" />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
        {t("to")}
        <input name="to" type="date" defaultValue={to} className="h-10 rounded-lg border border-input bg-background px-3 text-foreground" />
      </label>
      <button type="submit" className="min-h-touch rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground">{t("apply")}</button>
      <a href="?" className="flex min-h-touch items-center justify-center rounded-lg border border-input px-4 text-xs font-semibold">{t("all")}</a>
    </form>
  );
}
