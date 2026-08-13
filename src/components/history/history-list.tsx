"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { BetResult, Currency } from "@prisma/client";
import { CaretDown, CalendarX, X } from "@phosphor-icons/react";
import { deleteBet, deleteBets } from "@/lib/actions/bets";
import { currencySymbol } from "@/lib/format";
import { computeProfit } from "@/lib/profit";
import { groupHistoryBets } from "@/lib/history-grouping";
import { Button } from "@/components/ui/button";
import { HistoryFilters } from "./history-filters";
import { HistoryBetItem } from "./history-bet-item";
import { DeleteBetsDrawer } from "./delete-bets-drawer";
import { EditResultSheet } from "./edit-result-sheet";

export type HistoryBetItemData = {
  id: string;
  bankrollId: string;
  bankrollName: string;
  date: Date;
  sport: string;
  betType: string;
  description: string | null;
  eventResult: string | null;
  stake: number;
  odds: number;
  result: BetResult;
  cashOutAmount: number | null;
  boosted: boolean;
  originalOdds: number | null;
  freebet: boolean;
  live: boolean;
  profit: number;
};

export function HistoryList({
  bets: initialBets,
  bankrollOptions,
  scopedToBankroll = false,
  currency,
}: {
  bets: HistoryBetItemData[];
  // Omis quand scopedToBankroll est vrai (écran Détail bankroll) : pas de
  // sélecteur de bankroll ni de nom répété sur chaque ligne, voir plus bas.
  bankrollOptions?: { id: string; name: string }[];
  scopedToBankroll?: boolean;
  currency: Currency;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("history");
  const tCommon = useTranslations("common");
  const [bets, setBets] = useState(initialBets);
  const [sport, setSport] = useState<string | null>(null);
  const [bankroll, setBankroll] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BetResult | null>(null);

  // Un seul item peut être ouvert en swipe à la fois (voir history-bet-item.tsx
  // pour la coordination swipe / appui long).
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [editTarget, setEditTarget] = useState<HistoryBetItemData | null>(null);
  const [openMonthKey, setOpenMonthKey] = useState<string | null>(null);
  const [openWeekKey, setOpenWeekKey] = useState<string | null>(null);
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);

  const sportOptions = useMemo(
    () => Array.from(new Set(bets.map((b) => b.sport))).sort(),
    [bets]
  );

  const filteredBets = useMemo(
    () =>
      bets.filter((b) => {
        const searchText = `${b.sport} ${b.betType} ${b.description ?? ""} ${b.eventResult ?? ""} ${b.bankrollName}`.toLocaleLowerCase();
        return (!sport || b.sport === sport) && (!bankroll || b.bankrollId === bankroll) &&
          (!result || b.result === result) && (!query.trim() || searchText.includes(query.trim().toLocaleLowerCase()));
      }),
    [bets, sport, bankroll, result, query]
  );
  const selectedProfit = filteredBets
    .filter((bet) => bet.result !== "EN_ATTENTE")
    .reduce((sum, bet) => sum + bet.profit, 0);

  const groupedBets = useMemo(() => groupHistoryBets(filteredBets, locale), [filteredBets, locale]);

  const formatWeekDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
    [locale]
  );

  const toggleMonth = (monthKey: string) => {
    setOpenMonthKey((current) => (current === monthKey ? null : monthKey));
    setOpenWeekKey(null);
    setOpenDayKey(null);
  };

  const toggleWeek = (weekKey: string) => {
    setOpenWeekKey((current) => (current === weekKey ? null : weekKey));
    setOpenDayKey(null);
  };

  const toggleDay = (dayKey: string) => {
    setOpenDayKey((current) => (current === dayKey ? null : dayKey));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };
  const clearFilters = () => {
    setSport(null);
    setBankroll(null);
    setQuery("");
    setResult(null);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const handleEnterSelection = (id: string) => {
    setOpenItemId(null);
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleRequestEdit = (id: string) => {
    const bet = bets.find((b) => b.id === id);
    if (bet) setEditTarget(bet);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetIds) return;
    if (deleteTargetIds.length === 1) {
      await deleteBet(deleteTargetIds[0]);
    } else {
      await deleteBets(deleteTargetIds);
    }
    const idsToRemove = new Set(deleteTargetIds);
    setBets((prev) => prev.filter((b) => !idsToRemove.has(b.id)));
    setOpenItemId(null);
    setDeleteTargetIds(null);
    exitSelectionMode();
    // Rafraîchit les données serveur de la page (solde/graphique en-tête sur
    // l'écran Détail bankroll) — la liste elle-même est déjà à jour localement.
    router.refresh();
  };

  const handleSaved = (betId: string, result: BetResult, cashOutAmount: number | null) => {
    setBets((prev) =>
      prev.map((b) => {
        if (b.id !== betId) return b;
        const updated = { ...b, result, cashOutAmount };
        return { ...updated, profit: computeProfit(updated) };
      })
    );
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {selectionMode ? (
        <div className="glass-card flex items-center justify-between gap-2 rounded-xl p-3">
          <span className="text-sm font-medium">
            {t("selection.count", { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTargetIds(Array.from(selectedIds))}
              className="min-h-touch rounded-lg text-xs font-semibold"
            >
              {tCommon("delete")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("selection.cancelAriaLabel")}
              onClick={exitSelectionMode}
              className="min-h-touch min-w-touch rounded-lg text-muted-foreground"
            >
              <X size={16} aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <HistoryFilters
          sport={sport}
          bankroll={bankroll}
          query={query}
          result={result}
          sportOptions={sportOptions}
          bankrollOptions={scopedToBankroll ? undefined : bankrollOptions}
          onSportChange={setSport}
          onBankrollChange={setBankroll}
          onQueryChange={setQuery}
          onResultChange={setResult}
          onClear={clearFilters}
        />
      )}

      {!selectionMode && bets.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{t("summary.bets", { count: filteredBets.length })}</span>
          <strong className={selectedProfit >= 0 ? "num text-profit" : "num text-loss"}>
            {selectedProfit >= 0 ? "+" : ""}{selectedProfit.toFixed(2)}{currencySymbol(currency)}
          </strong>
        </div>
      )}

      {filteredBets.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-xl p-8 text-center">
          <CalendarX size={28} className="text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {bets.length === 0 ? tCommon("noBetsYet") : t("emptyNoMatch")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedBets.map((month) => (
            <section key={month.key} className="overflow-hidden rounded-xl border border-border">
              <h2>
                <button
                  type="button"
                  aria-expanded={openMonthKey === month.key}
                  onClick={() => toggleMonth(month.key)}
                  className="flex min-h-touch w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2 text-left text-sm font-semibold capitalize transition-colors hover:bg-muted/60"
                >
                  <span>{month.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t("accordion.bets", { count: month.betCount })}</span>
                    <span className={month.profit >= 0 ? "num text-profit" : "num text-loss"}>
                      {month.profit >= 0 ? "+" : ""}{month.profit.toFixed(2)}{currencySymbol(currency)}
                    </span>
                    <CaretDown className={openMonthKey === month.key ? "rotate-180 transition-transform" : "transition-transform"} size={16} aria-hidden />
                  </span>
                </button>
              </h2>
              {openMonthKey === month.key ? (
                <div className="flex flex-col gap-2 p-2">
                  {month.weeks.map((week) => {
                    const weekId = `${month.key}:${week.key}`;
                    return (
                      <div key={weekId} className="overflow-hidden rounded-lg border border-border/80">
                        <button
                          type="button"
                          aria-expanded={openWeekKey === weekId}
                          onClick={() => toggleWeek(weekId)}
                          className="flex min-h-touch w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/40"
                        >
                          <span>{t("accordion.week", { start: formatWeekDate.format(week.start), end: formatWeekDate.format(week.end) })}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">{t("accordion.bets", { count: week.betCount })}</span>
                            <span className={week.profit >= 0 ? "num text-profit" : "num text-loss"}>
                              {week.profit >= 0 ? "+" : ""}{week.profit.toFixed(2)}{currencySymbol(currency)}
                            </span>
                            <CaretDown className={openWeekKey === weekId ? "rotate-180 transition-transform" : "transition-transform"} size={15} aria-hidden />
                          </span>
                        </button>
                        {openWeekKey === weekId ? (
                          <div className="flex flex-col gap-2 border-t border-border/80 p-2">
                            {week.days.map((day) => {
                              const dayId = `${weekId}:${day.key}`;
                              return (
                                <div key={dayId}>
                                  <button
                                    type="button"
                                    aria-expanded={openDayKey === dayId}
                                    onClick={() => toggleDay(dayId)}
                                    className="flex min-h-touch w-full items-center justify-between gap-3 rounded-md px-2 text-left text-xs transition-colors hover:bg-muted/40"
                                  >
                                    <span className="font-medium capitalize text-muted-foreground">{day.label}</span>
                                    <span className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{t("accordion.bets", { count: day.bets.length })}</span>
                                      <span className={day.profit >= 0 ? "num font-semibold text-profit" : "num font-semibold text-loss"}>
                                        {day.profit >= 0 ? "+" : ""}{day.profit.toFixed(2)}{currencySymbol(currency)}
                                      </span>
                                      <CaretDown className={openDayKey === dayId ? "rotate-180 transition-transform" : "transition-transform"} size={14} aria-hidden />
                                    </span>
                                  </button>
                                  {openDayKey === dayId ? (
                                    <ul className="glass-card divide-y divide-border overflow-hidden rounded-lg">
                                      {day.bets.map((bet) => (
                                        <HistoryBetItem
                                          key={bet.id}
                                          bet={bet}
                                          selectionMode={selectionMode}
                                          selected={selectedIds.has(bet.id)}
                                          isOpen={openItemId === bet.id}
                                          showBankrollName={!scopedToBankroll}
                                          onOpenChange={setOpenItemId}
                                          onToggleSelect={handleToggleSelect}
                                          onEnterSelection={handleEnterSelection}
                                          onRequestDelete={(id) => setDeleteTargetIds([id])}
                                          onRequestEdit={handleRequestEdit}
                                          currency={currency}
                                        />
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}

      <DeleteBetsDrawer
        count={deleteTargetIds?.length ?? 0}
        open={deleteTargetIds !== null}
        onOpenChange={(open) => !open && setDeleteTargetIds(null)}
        onConfirm={handleConfirmDelete}
      />

      <EditResultSheet
        key={editTarget?.id ?? "none"}
        bet={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={handleSaved}
        currency={currency}
      />
    </div>
  );
}
