"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

export function ScanningView({
  files,
  done,
  total,
  currentFile,
  phase = "analysis",
  failed = 0,
}: {
  files?: File[];
  currentFile?: File | null;
  done: number; // images déjà analysées
  total: number;
  phase?: "transfer" | "analysis" | "restore" | "review";
  failed?: number;
}) {
  // Aperçu de l'image en cours d'analyse
  const currentIndex = Math.min(done, total - 1);
  const image = currentFile ?? files?.[currentIndex];
  const url = useMemo(
    () => image ? URL.createObjectURL(image) : null,
    [image]
  );
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const current = Math.min(done + 1, total);
  const t = useTranslations("scan.scanning");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="glass-card relative w-full max-w-72 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu blob local, next/image inutile */}
        {url ? <img
          src={url}
          alt={t("altText", { current, total })}
          className="max-h-96 w-full object-contain"
        /> : <div aria-hidden className="flex h-64 items-center justify-center bg-primary/5"><span className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>}
        {/* Ligne laser : balayage vertical lumineux pendant l'analyse IA */}
        {phase === "analysis" && url ? <div
          aria-hidden
          className="absolute inset-x-0 h-0.5 animate-scan-laser bg-primary"
          style={{
            boxShadow:
              "0 0 12px 3px var(--primary), 0 0 28px 8px oklch(0.72 0.14 250 / 35%)",
          }}
        /> : null}
      </div>

      <div
        aria-live="polite"
        className="flex flex-col items-center gap-1 text-center"
      >
        <span className="num text-sm font-semibold">
          {phase === "transfer" ? total ? `Récupération du ticket ${current}/${total}…` : "Récupération de vos captures…" : phase === "restore" ? `Reprise du ticket ${current}/${total}…` : phase === "review" ? "Préparation de la vérification…" : t("progress", { current, total })}
        </span>
        <span className="max-w-sm text-xs text-muted-foreground">{phase === "transfer" ? "Vos captures rejoignent le Scan Kalivoa." : phase === "restore" ? "Ce ticket a déjà été analysé. Son résultat est conservé." : phase === "review" ? "Vous allez pouvoir vérifier et corriger les paris détectés." : t("hint")}</span>
        {failed > 0 ? <span className="mt-2 text-xs text-loss">{failed} capture(s) à reprendre après l’analyse.</span> : null}
      </div>
      {total > 0 ? <div className="w-full max-w-72">
        <div role="progressbar" aria-label="Progression du lot" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(done, total)} className="h-1.5 overflow-hidden rounded-full bg-primary/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(done / total, 1) * 100}%` }} />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{Math.min(done, total)} / {total} captures traitées</p>
      </div> : null}
    </div>
  );
}
