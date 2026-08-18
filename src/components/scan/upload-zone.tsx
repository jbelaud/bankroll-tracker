"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Scan, Images, PencilSimpleLine, Sparkle, FrameCorners, ListChecks } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BankrollOption } from "./scan-flow";

export function UploadZone({
  bankrolls,
  bankrollId,
  onBankrollChange,
  onFilesSelected,
}: {
  bankrolls: BankrollOption[];
  bankrollId: string;
  onBankrollChange: (id: string) => void;
  onFilesSelected: (files: File[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("scan.upload");

  const handleFiles = (list: FileList | null) => {
    if (list && list.length > 0) onFilesSelected(Array.from(list));
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1.5 animate-fade-in-up">
        <Label htmlFor="scan-bankroll" className="text-xs">
          {t("importInto")}
        </Label>
        <Select
          value={bankrollId}
          onValueChange={(v) => onBankrollChange(v as string)}
          items={Object.fromEntries(
            bankrolls.map((br) => [br.id, `${br.name} (${br.bookmaker})`])
          )}
        >
          <SelectTrigger
            id="scan-bankroll"
            className="min-h-touch w-full rounded-lg px-3 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bankrolls.map((br) => (
              <SelectItem key={br.id} value={br.id} className="min-h-touch text-sm">
                {br.name} ({br.bookmaker})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inputs natifs cachés : appareil photo (capture) et galerie (multi) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        aria-hidden
        tabIndex={-1}
      />

      <div
        className="flex flex-1 flex-col items-center justify-center gap-5 animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex size-36 flex-col items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground animate-pulse-glow transition-transform active:scale-95"
        >
          <Scan size={44} weight="bold" aria-hidden />
          <span className="text-sm font-semibold">{t("scanButton")}</span>
        </button>
        <p className="max-w-56 text-center text-xs text-muted-foreground">
          {t("hint")}
        </p>

        <section
          aria-label={t("tips.ariaLabel")}
          className="w-full max-w-sm rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 text-left shadow-[0_12px_32px_-24px_color-mix(in_oklch,var(--primary),transparent_15%)] transition-colors hover:bg-primary/[0.09]"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkle size={18} weight="fill" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">{t("tips.eyebrow")}</p>
              <h2 className="mt-0.5 text-sm font-semibold tracking-tight">{t("tips.title")}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("tips.description")}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex gap-2 rounded-xl bg-background/70 p-2.5">
              <FrameCorners size={18} className="mt-0.5 shrink-0 text-primary" weight="bold" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">{t("tips.clearCapture")}</p>
            </div>
            <div className="flex gap-2 rounded-xl bg-background/70 p-2.5">
              <ListChecks size={18} className="mt-0.5 shrink-0 text-primary" weight="bold" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">{t("tips.multipleBets")}</p>
            </div>
          </div>
        </section>

        <Button
          variant="outline"
          onClick={() => galleryRef.current?.click()}
          className="min-h-touch rounded-lg px-5 text-sm"
        >
          <Images size={18} aria-hidden />
          {t("gallery")}
        </Button>

        <Link
          href="/scan/manual"
          className="flex min-h-touch items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors active:text-foreground hover:text-foreground"
        >
          <PencilSimpleLine size={14} aria-hidden />
          {t("manualEntry")}
        </Link>
      </div>
    </div>
  );
}
