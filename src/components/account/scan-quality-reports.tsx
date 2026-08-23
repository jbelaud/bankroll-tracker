"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteOwnScanQualityReport } from "@/lib/actions/scan-quality";

export function ScanQualityReports({ reports }: { reports: { id: string; bookmaker: string; createdAt: string }[] }) {
  const [pending, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("account.qualityReports");
  if (reports.length === 0) return null;
  return (
    <section className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <div><h2 className="text-sm font-semibold">{t("title")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("description")}</p></div>
      {reports.map((report) => <div key={report.id} className="flex items-center justify-between gap-2 text-xs"><span>{report.bookmaker} · {new Intl.DateTimeFormat(locale).format(new Date(report.createdAt))}</span><Button size="xs" variant="destructive" disabled={pending} onClick={() => startTransition(() => deleteOwnScanQualityReport(report.id))}>{t("delete")}</Button></div>)}
    </section>
  );
}
