"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Warning, Lightbulb, ArrowCounterClockwise, CheckCircle } from "@phosphor-icons/react";
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
import { bankrollOptionLabel, type BankrollOption } from "./scan-flow";
import { trackPublicGrowthEvent } from "@/lib/growth/client";
import { fmtMoney, fmtUnits } from "@/lib/format";
import { toUnits } from "@/lib/bankroll-units";
import { Link } from "@/i18n/navigation";
import { getBankrollUnitReference } from "@/lib/actions/bankroll-references";
import type { TipsterOption } from "@/lib/tipsters/types";

export function ReviewList({
  initialBets,
  importing,
  error,
  resultProofMode,
  skippedDuplicateFiles,
  onConfirm,
  onRestart,
  bankrolls,
  bankrollId,
  onBankrollChange,
  detectedBookmakers,
  showQualityOffer,
  currency,
  taxonomy,
  initialTipsters,
  initialExcludedIndexes = [],
  onReviewChange,
  bankrollSelectionLocked = false,
}: {
  initialBets: ParsedBet[];
  importing: boolean;
  error: string;
  resultProofMode?: "single" | "batch";
  skippedDuplicateFiles: string[];
  onConfirm: (bets: ParsedBet[], shareQuality: boolean, qualityIssueType: string, qualityIssueDetails: string, ticketCurrency: Currency, ticketFxRate: number | null, expectedReferenceCapital: number | null) => void;
  onRestart: () => void;
  bankrolls: BankrollOption[];
  bankrollId: string;
  onBankrollChange: (id: string) => void;
  detectedBookmakers: string[];
  showQualityOffer: boolean;
  currency: Currency;
  taxonomy: Taxonomy;
  initialTipsters: TipsterOption[];
  initialExcludedIndexes?: number[];
  onReviewChange?: (bets: ParsedBet[], excludedIndexes: number[], bankrollId: string) => void;
  bankrollSelectionLocked?: boolean;
}) {
  const [bets, setBets] = useState(initialBets);
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set(initialExcludedIndexes));
  const [shareQuality, setShareQuality] = useState(false);
  const [qualityIssueType, setQualityIssueType] = useState("INCORRECT");
  const [qualityIssueDetails, setQualityIssueDetails] = useState("");
  const [tipsters, setTipsters] = useState(initialTipsters);
  const [confirmedUnitScale, setConfirmedUnitScale] = useState<string | null>(null);
  const [ticketCurrency, setTicketCurrency] = useState<Currency>(currency);
  const [ticketFxRate, setTicketFxRate] = useState("");
  const [freshUnitReference, setFreshUnitReference] = useState<{ bankrollId: string; value: number | null } | null>(null);
  const [refreshingUnitReference, setRefreshingUnitReference] = useState(false);
  const [unitReferenceError, setUnitReferenceError] = useState(false);
  const duplicateWarningTracked = useRef(false);
  const bookmakerMismatchTracked = useRef(false);
  const reviewChangeRef = useRef(onReviewChange);
  const t = useTranslations("scan.review");
  const locale = useLocale();

  useEffect(() => {
    reviewChangeRef.current = onReviewChange;
  }, [onReviewChange]);

  // La revue est durable : toute correction, exclusion ou sélection de
  // bankroll est sauvegardée après une courte pause, sans les images source.
  useEffect(() => {
    if (!reviewChangeRef.current) return;
    const timer = window.setTimeout(() => {
      reviewChangeRef.current?.(bets, Array.from(excluded), bankrollId);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [bets, excluded, bankrollId]);

  const patchBet = (index: number, patch: Partial<ParsedBet>) =>
    setBets((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch, updatesExistingBet: undefined } : b))
    );

  const changeBankroll = (id: string) => {
    // Le rapprochement a été calculé pour la bankroll analysée. Dès qu'elle
    // change, on retire la promesse visuelle ; le serveur décidera à nouveau
    // au moment de l'import selon les données réellement sélectionnées.
    setBets((prev) => prev.map((bet) => ({ ...bet, updatesExistingBet: undefined, pendingTicketAlreadyExists: undefined })));
    onBankrollChange(id);
  };

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
  // Dans un parcours de preuve de résultat, retrouver le pari existant est
  // précisément le comportement attendu. La validation serveur cible ce pari
  // et interdit toute création : l'avertissement de doublon générique serait
  // donc trompeur ici.
  const duplicateCount = resultProofMode ? 0 : kept.filter((b) => b.possibleDuplicate).length;
  const existingUpdateCount = kept.filter((b) => b.updatesExistingBet).length;
  const pendingTicketCount = kept.filter((b) => b.pendingTicketAlreadyExists && b.result === "EN_ATTENTE").length;
  const suggestedCount = kept.filter(hasSuggestedType).length;
  const taxonomyMismatchCount = kept.filter((bet) => bet.taxonomyMismatch).length;
  const selectedBankroll = bankrolls.find((bankroll) => bankroll.id === bankrollId);
  const referenceCapital = freshUnitReference?.bankrollId === bankrollId
    ? freshUnitReference.value : selectedBankroll?.referenceCapital ?? null;
  const targetCurrency = selectedBankroll?.currency === "UNIT" ? selectedBankroll.referenceCurrency : selectedBankroll?.currency;
  const needsFx = Boolean(targetCurrency && ticketCurrency !== targetCurrency);
  const parsedFxRate = Number(ticketFxRate.replace(",", "."));
  const fxRate = needsFx ? Number.isFinite(parsedFxRate) && parsedFxRate > 0 ? parsedFxRate : null : 1;
  const canConvert = fxRate !== null && (selectedBankroll?.currency !== "UNIT" || Boolean(referenceCapital && referenceCapital > 0));
  const oversizedUnitStakes = selectedBankroll?.currency === "UNIT" && canConvert && referenceCapital && referenceCapital > 0
    ? kept.filter((bet) => bet.stake !== null && (bet.stake * fxRate!) / referenceCapital * 100 > 20)
    : [];
  const unitScaleKey = `${bankrollId}:${referenceCapital}:${ticketCurrency}:${fxRate}:${kept.map((bet) => bet.stake ?? "").join(",")}`;
  const unitScaleNeedsConfirmation = oversizedUnitStakes.length > 0 && confirmedUnitScale !== unitScaleKey;
  const selectedBookmaker = selectedBankroll?.bookmaker ?? (selectedBankroll?.allocations.length === 1 ? selectedBankroll.allocations[0].bookmaker : null);
  const bookmakerMismatch = Boolean(
    selectedBookmaker &&
      detectedBookmakers.length > 0 &&
      detectedBookmakers.some(
        (bookmaker) =>
          normalizeBookmaker(bookmaker).toLocaleLowerCase("fr") !==
          normalizeBookmaker(selectedBookmaker).toLocaleLowerCase("fr")
      )
  );
  useEffect(() => {
    if (duplicateCount > 0 && !duplicateWarningTracked.current) {
      duplicateWarningTracked.current = true;
      void trackPublicGrowthEvent("duplicate_warning_shown", { bets_detected: initialBets.length });
    }
  }, [duplicateCount, initialBets.length]);
  useEffect(() => {
    if (bookmakerMismatch && !bookmakerMismatchTracked.current) {
      bookmakerMismatchTracked.current = true;
      void trackPublicGrowthEvent("bookmaker_mismatch_warning_shown", { detected_bookmakers_count: detectedBookmakers.length });
    }
  }, [bookmakerMismatch, detectedBookmakers.length]);
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
    <div className="flex flex-col gap-4 pb-24 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:pb-28">
      <div className="flex items-center justify-between lg:col-span-12">
        <h2 className="text-base font-semibold">
          {resultProofMode === "single"
            ? t("resultProofTitle")
            : resultProofMode === "batch"
              ? t("resultProofBatchTitle", { count: bets.length })
              : t("title", { count: bets.length })}
        </h2>
        <Button
          variant="ghost"
          onClick={onRestart}
          disabled={importing || bankrollSelectionLocked}
          className="min-h-touch rounded-lg text-xs text-muted-foreground"
        >
          <ArrowCounterClockwise size={15} aria-hidden />
          {t("restart")}
        </Button>
      </div>

      {resultProofMode && (
        <section role="status" className="flex items-start gap-2 rounded-xl border border-profit/35 bg-profit/10 p-3 text-sm text-profit lg:col-span-12">
          <CheckCircle size={19} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{resultProofMode === "single" ? t("targetedResultTitle") : t("targetedResultBatchTitle")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{resultProofMode === "single" ? t("targetedResultDescription") : t("targetedResultBatchDescription")}</p>
          </div>
        </section>
      )}

      {!resultProofMode && existingUpdateCount > 0 && (
        <section role="status" className="flex items-start gap-2 rounded-xl border border-profit/35 bg-profit/10 p-3 text-sm text-profit lg:col-span-12">
          <CheckCircle size={19} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t("existingResultUpdateTitle", { count: existingUpdateCount })}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{t("existingResultUpdateDescription")}</p>
          </div>
        </section>
      )}

      {pendingTicketCount > 0 && (
        <section role="alert" className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning lg:col-span-12">
          <Warning size={19} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <p>{t("pendingTicketWarning")}</p>
        </section>
      )}

      {duplicateCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warning lg:col-span-12">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {t("duplicateWarning")}
        </p>
      )}
      {skippedDuplicateFiles.length > 0 && (
        <p role="status" className="flex items-start gap-1.5 text-xs text-muted-foreground lg:col-span-12">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden />
          {t("duplicateScanSkipped", { files: skippedDuplicateFiles.join(", ") })}
        </p>
      )}
      {suggestedCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-chart-4 lg:col-span-12">
          <Lightbulb size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {t("suggestedWarning")}
        </p>
      )}
      {taxonomyMismatchCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warning lg:col-span-12">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          {t("taxonomyMismatchWarning")}
        </p>
      )}

      <aside className="flex flex-col gap-3 lg:col-span-3 lg:sticky lg:top-24">
      <section className="rounded-xl border border-border bg-muted/40 p-3">
        <label htmlFor="review-bankroll" className="text-xs font-medium">
          {resultProofMode ? t("resultProofBankrollLabel") : t("bankrollLabel")}
        </label>
        <Select
          value={bankrollId}
          onValueChange={(value) => changeBankroll(value as string)}
          disabled={importing || bankrollSelectionLocked}
          items={Object.fromEntries(
            bankrolls.map((bankroll) => [bankroll.id, bankrollOptionLabel(bankroll)])
          )}
        >
          <SelectTrigger id="review-bankroll" className="mt-2 min-h-touch w-full rounded-lg px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bankrolls.map((bankroll) => (
              <SelectItem key={bankroll.id} value={bankroll.id} className="min-h-touch text-sm">
                {bankrollOptionLabel(bankroll)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed">
        <label htmlFor="review-ticket-currency" className="block font-semibold">Devise lue sur le ticket</label>
        <select id="review-ticket-currency" value={ticketCurrency} onChange={(event) => { setTicketCurrency(event.target.value as Currency); setConfirmedUnitScale(null); }} disabled={importing} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
          <option value="EUR">€ — Euro</option><option value="USD">$ — Dollar</option><option value="GBP">£ — Livre</option>
        </select>
        {needsFx ? <div className="mt-2"><label htmlFor="review-ticket-fx" className="block font-semibold">Taux explicite : 1 {ticketCurrency} en {targetCurrency}</label><input id="review-ticket-fx" type="number" min="0.000001" step="any" inputMode="decimal" value={ticketFxRate} onChange={(event) => setTicketFxRate(event.target.value)} disabled={importing} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-2 text-sm" /><p className="mt-1 text-muted-foreground">Vérifie ce taux toi-même ; Kalivoa ne récupère aucun taux de change automatiquement.</p></div> : null}
        {selectedBankroll?.currency === "UNIT" ? <p className="mt-2 font-semibold">Cette bankroll suit les mises et les résultats en U. Les euros du ticket sont conservés comme preuve privée.</p> : null}
        <p className="font-semibold">{referenceCapital && referenceCapital > 0
          ? t("unitConversion", {
            reference: fmtMoney(referenceCapital, locale, selectedBankroll?.referenceCurrency ?? currency),
            value: fmtMoney(referenceCapital / 100, locale, selectedBankroll?.referenceCurrency ?? currency),
          })
          : t("unitConversionMissing")}</p>
        <p className="mt-1 text-muted-foreground">{t("unitConversionHelp")}</p>
        {selectedBankroll?.currency === "UNIT" && canConvert && kept.length > 0 ? <div className="mt-3 space-y-1 border-t border-primary/20 pt-2">
          <p className="font-semibold">Conversion proposée avant enregistrement</p>
          {kept.map((bet, index) => bet.stake === null ? null : <p key={index} className="num">{fmtMoney(bet.stake, locale, ticketCurrency)} → {fmtUnits(toUnits(bet.stake * fxRate!, referenceCapital)!, locale)}</p>)}
        </div> : null}
        {!canConvert ? <p role="alert" className="mt-2 font-semibold text-warning">Renseigne le montant de référence et, si les devises diffèrent, un taux de change valide avant d’importer le ticket.</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/bankrolls" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">{t("unitConversionSettings")}</Link>
          <button type="button" disabled={!bankrollId || refreshingUnitReference || importing}
            className="font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
            onClick={async () => {
              setRefreshingUnitReference(true);
              setUnitReferenceError(false);
              try {
                const value = await getBankrollUnitReference(bankrollId);
                setFreshUnitReference({ bankrollId, value });
                setConfirmedUnitScale(null);
              } catch {
                setUnitReferenceError(true);
              } finally {
                setRefreshingUnitReference(false);
              }
            }}>{t(refreshingUnitReference ? "unitConversionRefreshing" : "unitConversionRefresh")}</button>
        </div>
        {unitReferenceError ? <p role="alert" className="mt-1 text-loss">{t("unitConversionRefreshError")}</p> : null}
      </section>

      {oversizedUnitStakes.length > 0 ? <label className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={confirmedUnitScale === unitScaleKey}
          onChange={(event) => setConfirmedUnitScale(event.target.checked ? unitScaleKey : null)} disabled={importing} />
        {t("unitConversionWarning", { count: oversizedUnitStakes.length })}
      </label> : null}

      {bookmakerMismatch && selectedBankroll && (
        <section className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <p>{t("bookmakerMismatch", {
            detected: detectedBookmakers.join(", "),
            selected: selectedBookmaker ?? "",
          })}</p>
        </section>
      )}

      {showQualityOffer && (
        <section className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <p className="font-medium">{t("qualityOffer.title")}</p>
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={shareQuality}
              onChange={(event) => setShareQuality(event.target.checked)}
              disabled={importing}
              className="mt-0.5"
            />
            <span>
              {t("qualityOffer.consent")}
              <span className="mt-1 block text-muted-foreground">{t("qualityOffer.details")}</span>
            </span>
          </label>
          {shareQuality && (
            <div className="mt-3 flex flex-col gap-2">
              <label htmlFor="scan-issue-type" className="font-medium">{t("qualityOffer.issueTypeLabel")}</label>
              <select
                id="scan-issue-type"
                value={qualityIssueType}
                onChange={(event) => setQualityIssueType(event.target.value)}
                disabled={importing}
                className="min-h-touch rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="INCORRECT">{t("qualityOffer.issueTypes.incorrect")}</option>
                <option value="INCOMPLETE">{t("qualityOffer.issueTypes.incomplete")}</option>
                <option value="OTHER">{t("qualityOffer.issueTypes.other")}</option>
              </select>
              <label htmlFor="scan-issue-details" className="font-medium">{t("qualityOffer.detailsLabel")}</label>
              <textarea
                id="scan-issue-details"
                value={qualityIssueDetails}
                onChange={(event) => setQualityIssueDetails(event.target.value.slice(0, 1_000))}
                disabled={importing}
                maxLength={1_000}
                rows={3}
                placeholder={t("qualityOffer.detailsPlaceholder")}
                className="rounded-lg border border-input bg-background p-2 text-sm"
              />
            </div>
          )}
        </section>
      )}
      </aside>

      <ul className="flex flex-col gap-3 lg:col-span-9 xl:grid xl:grid-cols-2">
        {bets.map((bet, i) => (
          <ReviewBetCard
            key={i}
            bet={bet}
            index={i}
            excluded={excluded.has(i)}
            onPatch={(patch) => patchBet(i, patch)}
            onToggleExcluded={() => toggleExcluded(i)}
            currency={ticketCurrency}
            stakeUnitPreview={bet.stake !== null && fxRate !== null && referenceCapital && referenceCapital > 0
              ? toUnits(bet.stake * fxRate, referenceCapital) : null}
            taxonomy={reviewTaxonomy}
            tipsters={tipsters}
            resultProofMode={Boolean(resultProofMode)}
            onTipsterCreated={(tipster) => setTipsters((items) => [
              ...items.filter((item) => item.id !== tipster.id),
              tipster,
            ])}
          />
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-loss lg:col-span-12">
          {error}
        </p>
      )}

      {/* Zone nav + bouton Scan saillant : la confirmation doit rester entièrement au-dessus. */}
      <div className="fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-md px-4 lg:left-64 lg:bottom-[calc(1rem+var(--rg-footer-h))] lg:max-w-none lg:px-8 xl:px-10">
        <Button
          onClick={() => onConfirm(kept, shareQuality, qualityIssueType, qualityIssueDetails, ticketCurrency, needsFx ? fxRate : null, referenceCapital)}
          disabled={kept.length === 0 || importing || refreshingUnitReference || unitScaleNeedsConfirmation || !canConvert}
          className="min-h-touch w-full rounded-lg text-sm font-semibold shadow-lg lg:mx-auto lg:max-w-2xl"
        >
          {importing
            ? resultProofMode ? t("updatingResult") : t("importing")
            : kept.length === 0
              ? t("noneToImport")
              : resultProofMode === "single"
                ? t("updateResult")
                : resultProofMode === "batch"
                  ? t("updateResults", { count: kept.length })
                  : t("import", { count: kept.length })}
        </Button>
      </div>
    </div>
  );
}
