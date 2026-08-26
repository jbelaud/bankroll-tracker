"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DownloadSimple, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { exportUserData } from "@/lib/actions/export";
import { betsToCsv } from "@/lib/export/bets-to-csv";

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportDataButton() {
  const [loading, setLoading] = useState<"json" | "csv" | null>(null);
  const t = useTranslations("account.data");
  const today = new Date().toISOString().slice(0, 10);

  const handleExportJson = async () => {
    setLoading("json");
    try {
      const data = await exportUserData();
      downloadBlob(JSON.stringify(data, null, 2), "application/json", `kalivoa-export-${today}.json`);
    } finally {
      setLoading(null);
    }
  };

  const handleExportCsv = async () => {
    setLoading("csv");
    try {
      const data = await exportUserData();
      downloadBlob(betsToCsv(data.bets), "text/csv", `kalivoa-bets-${today}.csv`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleExportJson}
        disabled={loading !== null}
        variant="outline"
        className="min-h-touch w-full rounded-lg text-sm"
      >
        {loading === "json" ? (
          <CircleNotch size={16} className="animate-spin" aria-hidden />
        ) : (
          <DownloadSimple size={16} aria-hidden />
        )}
        {t("exportJson")}
      </Button>
      <Button
        onClick={handleExportCsv}
        disabled={loading !== null}
        variant="outline"
        className="min-h-touch w-full rounded-lg text-sm"
      >
        {loading === "csv" ? (
          <CircleNotch size={16} className="animate-spin" aria-hidden />
        ) : (
          <DownloadSimple size={16} aria-hidden />
        )}
        {t("exportCsv")}
      </Button>
    </div>
  );
}
