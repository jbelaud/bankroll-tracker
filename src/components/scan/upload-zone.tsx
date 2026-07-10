"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Scan, Images, PencilSimpleLine } from "@phosphor-icons/react";
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
