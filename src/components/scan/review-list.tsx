"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Warning, Lightbulb, ArrowCounterClockwise } from "@phosphor-icons/react";
import { hasSuggestedType, type ParsedBet } from "@/lib/scan/types";
import { normalizeBookmaker } from "@/lib/bookmakers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewBetCard } from "./review-bet-card";
import type { Taxonomy } from "@/lib/taxonomy";
import type { BankrollOption } from "./scan-flow";

export function ReviewList({
  initialBets,
  importing,
  error,
  onConfirm,
  onRestart,
  bankrolls,
  bankrollId,
  onBankrollChange,
  detectedBookmakers,
  showQualityOffer,
  currency,
  taxonomy,
}: {
  initialBets: ParsedBet[];
  importing: boolean;
  error: string;
  onConfirm: (bets: ParsedBet[], shareQuality: boolean) => void;
  onRestart: () => void;
  bankrolls: BankrollOption[];
  bankrollId: string;
  onBankrollChange: (id: string) => void;
  detectedBookmakers: string[];
  showQualityOffer: boolean;
  currency: Currency;
  taxonomy: Taxonomy;
}) {
  const [bets, setBets] = useState(initialBets);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [shareQuality, setShareQuality] = useState(false);
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
  const taxonomyMismatchCount = kept.filter((bet) => bet.taxonomyMismatch).length;
  const selectedBankroll = bankrolls.find((bankroll) => bankroll.id === bankrollId);
  const bookmakerMismatch = Boolean(
    selectedBankroll &&
      detectedBookmakers.length > 0 &&
      detectedBookmakers.some(
        (bookmaker) =>
          normalizeBookmaker(bookmaker).toLocaleLowerCase("fr") !==
          normalizeBookmaker(selectedBankroll.bookmaker).toLocaleLowerCase("fr")
      )
  );
  // Inclut immédiatement les valeurs proposées par le scan : l'utilisateur
  // peut donc les corriger/valider avant qu'elles soient sauvegardées.
  const reviewTaxonomy = useMemo(() => {
    const next = Object.fromEntries(
      Object.entries(taxonomy).map(([sport, types]) => [sport, [...types]])
    ) as Taxonomy;
    for (const bet of bets) {
      next[bet.sport] ??= [];
      if (!next[bet.sport].includes(bet.betType)) next[bet.sport].push(bet.betType);
    }
    return next;
  }, [bets, taxonomy]);

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
      {taxonomyMismatchCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {t("taxonomyMismatchWarning")}
        </p>
      )}

      <section className="rounded-xl border border-border bg-muted/40 p-3">
        <label htmlFor="review-bankroll" className="text-xs font-medium">
          {t("bankrollLabel")}
        </label>
        <Select
          value={bankrollId}
          onValueChange={(value) => onBankrollChange(value as string)}
          disabled={importing}
          items={Object.fromEntries(
            bankrolls.map((bankroll) => [bankroll.id, `${bankroll.name} (${bankroll.bookmaker})`])
          )}
        >
          <SelectTrigger id="review-bankroll" className="mt-2 min-h-touch w-full rounded-lg px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bankrolls.map((bankroll) => (
              <SelectItem key={bankroll.id} value={bankroll.id} className="min-h-touch text-sm">
                {bankroll.name} ({bankroll.bookmaker})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {bookmakerMismatch && selectedBankroll && (
        <section className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <p>{t("bookmakerMismatch", {
            detected: detectedBookmakers.join(", "),
            selected: selectedBankroll.bookmaker,
          })}</p>
        </section>
      )}

      {showQualityOffer && (
        <section className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <p className="font-medium">Ce bookmaker n&apos;est pas encore pleinement testé. Vous pouvez aider BetTrack à améliorer la compatibilité.</p>
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={shareQuality}
              onChange={(event) => setShareQuality(event.target.checked)}
              disabled={importing}
              className="mt-0.5"
            />
            <span>
              Partager ce scan avec BetTrack pour améliorer la compatibilité de ce bookmaker.
              <span className="mt-1 block text-muted-foreground">Seuls les administrateurs BetTrack autorisés pourront consulter la capture, uniquement à cette fin. Elle peut contenir une référence, un solde ou un pseudo ; vous pouvez la supprimer à tout moment.</span>
            </span>
          </label>
        </section>
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
            taxonomy={reviewTaxonomy}
          />
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}

      {/* Zone nav + bouton Scan saillant : la confirmation doit rester entièrement au-dessus. */}
      <div className="fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-md px-4">
        <Button
          onClick={() => onConfirm(kept, shareQuality)}
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
