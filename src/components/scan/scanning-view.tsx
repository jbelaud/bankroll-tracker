"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

export function ScanningView({
  files,
  done,
  total,
}: {
  files: File[];
  done: number; // images déjà analysées
  total: number;
}) {
  // Aperçu de l'image en cours d'analyse
  const currentIndex = Math.min(done, total - 1);
  const url = useMemo(
    () => URL.createObjectURL(files[currentIndex]),
    [files, currentIndex]
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const current = Math.min(done + 1, total);
  const t = useTranslations("scan.scanning");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="glass-card relative w-full max-w-72 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu blob local, next/image inutile */}
        <img
          src={url}
          alt={t("altText", { current, total })}
          className="max-h-96 w-full object-contain"
        />
        {/* Ligne laser : balayage vertical lumineux pendant l'analyse IA */}
        <div
          aria-hidden
          className="absolute inset-x-0 h-0.5 animate-scan-laser bg-primary"
          style={{
            boxShadow:
              "0 0 12px 3px var(--primary), 0 0 28px 8px oklch(0.72 0.14 250 / 35%)",
          }}
        />
      </div>

      <div
        aria-live="polite"
        className="flex flex-col items-center gap-1 text-center"
      >
        <span className="num text-sm font-semibold">
          {t("progress", { current, total })}
        </span>
        <span className="text-xs text-muted-foreground">{t("hint")}</span>
      </div>
    </div>
  );
}
