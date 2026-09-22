"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Scan, Images, PencilSimpleLine, Sparkle, FrameCorners, ListChecks, FileArrowUp, ArrowRight, CaretDown } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { bankrollOptionLabel, type BankrollOption } from "./scan-flow";

const MAX_GALLERY_IMAGES = 10;

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
  const [galleryError, setGalleryError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const t = useTranslations("scan.upload");

  const handleCameraFiles = (list: FileList | null) => {
    if (list && list.length > 0) onFilesSelected(Array.from(list));
  };

  const handleGalleryFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (list.length > MAX_GALLERY_IMAGES) {
      setGalleryError(t("galleryLimit", { count: MAX_GALLERY_IMAGES }));
      return;
    }
    setGalleryError("");
    onFilesSelected(Array.from(list));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleGalleryFiles(event.dataTransfer.files);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-1.5 animate-fade-in-up lg:max-w-md">
        <Label htmlFor="scan-bankroll" className="text-xs">
          {t("importInto")}
        </Label>
        <Select
          value={bankrollId}
          onValueChange={(v) => onBankrollChange(v as string)}
          items={Object.fromEntries(
            bankrolls.map((br) => [br.id, bankrollOptionLabel(br)])
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
                {bankrollOptionLabel(br)}
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
        onChange={(e) => handleCameraFiles(e.target.files)}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)}
        aria-hidden
        tabIndex={-1}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-4 animate-fade-in-up sm:p-5 lg:min-h-[32rem] lg:gap-5 lg:p-8 ${isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/15"}`}
        style={{ animationDelay: "80ms" }}
      >
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex min-h-16 w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-primary px-5 text-primary-foreground shadow-sm animate-pulse-glow transition-transform active:scale-[0.98] lg:size-40 lg:flex-col lg:rounded-full lg:px-0"
        >
          <Scan size={30} weight="bold" aria-hidden className="lg:size-11" />
          <span className="text-sm font-semibold">{t("scanButton")}</span>
        </button>
        <p className="max-w-56 text-center text-xs text-muted-foreground">
          {t("hint")}
        </p>

        <Button
          variant="outline"
          onClick={() => galleryRef.current?.click()}
          className="min-h-touch w-full max-w-sm rounded-xl px-5 text-sm"
        >
          <Images size={18} aria-hidden />
          {t("gallery")}
        </Button>
        {galleryError && (
          <p role="alert" className="max-w-sm text-center text-xs text-loss">
            {galleryError}
          </p>
        )}

        <Link
          href="/scan/manual"
          className="flex min-h-touch items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors active:text-foreground hover:text-foreground"
        >
          <PencilSimpleLine size={14} aria-hidden />
          {t("manualEntry")}
        </Link>

        <details
          aria-label={t("tips.ariaLabel")}
          className="group w-full max-w-xl rounded-2xl border border-primary/25 bg-primary/[0.06] text-left shadow-[0_12px_32px_-24px_color-mix(in_oklch,var(--primary),transparent_15%)] transition-colors hover:bg-primary/[0.09]"
        >
          <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkle size={18} weight="fill" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">{t("tips.eyebrow")}</span>
              <span className="mt-0.5 block text-sm font-semibold tracking-tight">{t("tips.title")}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t("tips.description")}</span>
            </span>
            <CaretDown size={16} className="mt-2 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
            <div className="flex gap-2 rounded-xl bg-background/70 p-2.5">
              <FrameCorners size={18} className="mt-0.5 shrink-0 text-primary" weight="bold" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">{t("tips.clearCapture")}</p>
            </div>
            <div className="flex gap-2 rounded-xl bg-background/70 p-2.5">
              <ListChecks size={18} className="mt-0.5 shrink-0 text-primary" weight="bold" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">{t("tips.multipleBets")}</p>
            </div>
          </div>
        </details>

        <Link
          href="/import-history"
          className="group flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <FileArrowUp size={23} weight="duotone" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("fileImport.eyebrow")}</span>
            <span className="mt-0.5 block text-sm font-semibold">{t("fileImport.title")}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t("fileImport.description")}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
