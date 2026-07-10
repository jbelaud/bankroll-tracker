"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Warning, Lightbulb, ArrowCounterClockwise } from "@phosphor-icons/react";
import { hasSuggestedType, type ParsedBet } from "@/lib/scan/types";
import { Button } from "@/components/ui/button";
import { ReviewBetCard } from "./review-bet-card";

export function ReviewList({
  initialBets,
  importing,
  error,
  onConfirm,
  onRestart,
  currency,
}: {
  initialBets: ParsedBet[];
  importing: boolean;
  error: string;
  onConfirm: (bets: ParsedBet[]) => void;
  onRestart: () => void;
  currency: Currency;
}) {
  const [bets, setBets] = useState(initialBets);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const t = useTranslations("scan.review");

  const patchBet = (index: number, patch: Partial<ParsedBet>) =>
    setBets((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );

  const toggleExcluded = (index: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const kept = useMemo(
    () => bets.filter((_, i) => !excluded.has(i)),
    [bets, excluded]
  );
  const duplicateCount = kept.filter((b) => b.possibleDuplicate).length;
  const suggestedCount = kept.filter(hasSuggestedType).length;

  return (
    // pb élargi : la barre de confirmation fixe ne doit jamais masquer une card
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {t("title", { count: bets.length })}
        </h2>
        <Button
          variant="ghost"
          onClick={onRestart}
          disabled={importing}
          className="min-h-touch rounded-lg text-xs text-muted-foreground"
        >
          <ArrowCounterClockwise size={15} aria-hidden />
          {t("restart")}
        </Button>
      </div>

      {duplicateCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {t("duplicateWarning")}
        </p>
      )}
      {suggestedCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-chart-4">
          <Lightbulb size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {t("suggestedWarning")}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {bets.map((bet, i) => (
          <ReviewBetCard
            key={i}
            bet={bet}
            index={i}
            excluded={excluded.has(i)}
            onPatch={(patch) => patchBet(i, patch)}
            onToggleExcluded={() => toggleExcluded(i)}
            currency={currency}
          />
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}

      {/* Barre de confirmation fixe, au-dessus de la bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-md px-4">
        <Button
          onClick={() => onConfirm(kept)}
          disabled={kept.length === 0 || importing}
          className="min-h-touch w-full rounded-lg text-sm font-semibold shadow-lg"
        >
          {importing
            ? t("importing")
            : kept.length === 0
              ? t("noneToImport")
              : t("import", { count: kept.length })}
        </Button>
      </div>
    </div>
  );
}
