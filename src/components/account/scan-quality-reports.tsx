"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteOwnScanQualityReport } from "@/lib/actions/scan-quality";

export function ScanQualityReports({ reports }: { reports: { id: string; bookmaker: string; createdAt: string }[] }) {
  const [pending, startTransition] = useTransition();
  if (reports.length === 0) return null;
  return (
    <section className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <div><h2 className="text-sm font-semibold">Partages qualité des scans</h2><p className="mt-1 text-xs text-muted-foreground">Vous pouvez supprimer immédiatement un partage et sa capture privée.</p></div>
      {reports.map((report) => <div key={report.id} className="flex items-center justify-between gap-2 text-xs"><span>{report.bookmaker} · {new Date(report.createdAt).toLocaleDateString()}</span><Button size="xs" variant="destructive" disabled={pending} onClick={() => startTransition(() => deleteOwnScanQualityReport(report.id))}>Supprimer</Button></div>)}
    </section>
  );
}
