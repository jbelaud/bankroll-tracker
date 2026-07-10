"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DownloadSimple, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { exportUserData } from "@/lib/export/export-user-data";

export function ExportDataButton() {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("account.data");

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bettrack-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="min-h-touch w-full rounded-lg text-sm"
    >
      {loading ? (
        <CircleNotch size={16} className="animate-spin" aria-hidden />
      ) : (
        <DownloadSimple size={16} aria-hidden />
      )}
      {t("export")}
    </Button>
  );
}
