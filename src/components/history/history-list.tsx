"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { BetResult, Currency } from "@prisma/client";
import { CaretDown, CalendarX, X, ArrowsLeftRight, PencilSimple, TrashSimple, TrendDown, TrendUp } from "@phosphor-icons/react";
import { deleteBet, deleteBets, moveBets } from "@/lib/actions/bets";
import { currencySymbol, fmtDateWithYear, fmtMoney, fmtMoneySigned, fmtOdds } from "@/lib/format";
import { computeProfit } from "@/lib/profit";
import { groupHistoryBets } from "@/lib/history-grouping";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import { Button } from "@/components/ui/button";
import { HistoryFilters } from "./history-filters";
import { HistoryBetItem } from "./history-bet-item";
import { DeleteBetsDrawer } from "./delete-bets-drawer";
import { EditBetSheet } from "./edit-bet-sheet";
import type { Taxonomy } from "@/lib/taxonomy";
import { MoveBetsDrawer } from "./move-bets-drawer";

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
  odds: number | null;
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
  taxonomy,
}: {
  bets: HistoryBetItemData[];
  // Omis quand scopedToBankroll est vrai (écran Détail bankroll) : pas de
  // sélecteur de bankroll ni de nom répété sur chaque ligne, voir plus bas.
  bankrollOptions?: { id: string; name: string }[];
  scopedToBankroll?: boolean;
  currency: Currency;
  taxonomy: Taxonomy;
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
  const [moveTargetIds, setMoveTargetIds] = useState<string[] | null>(null);
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

  const handleSaved = (updatedBet: HistoryBetItemData) => {
    setBets((prev) =>
      prev.map((b) => {
        if (b.id !== updatedBet.id) return b;
        const updated = { ...b, ...updatedBet };
        return { ...updated, profit: computeProfit(updated) };
      })
    );
    router.refresh();
  };

  const handleConfirmMove = async (targetBankrollId: string) => {
    if (!moveTargetIds) return;
    await moveBets(moveTargetIds, targetBankrollId);
    const target = bankrollOptions?.find((bankroll) => bankroll.id === targetBankrollId);
    if (target) {
      const movedIds = new Set(moveTargetIds);
      setBets((previous) => previous.map((bet) =>
        movedIds.has(bet.id) ? { ...bet, bankrollId: target.id, bankrollName: target.name } : bet
      ));
    }
    setOpenItemId(null);
    setMoveTargetIds(null);
    exitSelectionMode();
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
              variant="outline"
              size="sm"
              onClick={() => setMoveTargetIds(Array.from(selectedIds))}
              className="min-h-touch rounded-lg text-xs font-semibold"
            >
              <ArrowsLeftRight size={14} aria-hidden />
              {t("selection.move")}
            </Button>
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
          <div className="flex items-center gap-3">
            <strong className={selectedProfit >= 0 ? "num text-profit" : "num text-loss"}>
              {selectedProfit >= 0 ? "+" : ""}{selectedProfit.toFixed(2)}{currencySymbol(currency)}
            </strong>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
              className="hidden min-h-touch rounded-lg text-xs font-semibold lg:inline-flex"
            >
              {t("table.select")}
            </Button>
          </div>
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
        <>
          <DesktopHistoryTable
            bets={filteredBets}
            currency={currency}
            scopedToBankroll={scopedToBankroll}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onRequestEdit={handleRequestEdit}
            onRequestDelete={(id) => setDeleteTargetIds([id])}
          />
          <div className="flex flex-col gap-4 lg:hidden">
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
        </>
      )}

      <DeleteBetsDrawer
        count={deleteTargetIds?.length ?? 0}
        open={deleteTargetIds !== null}
        onOpenChange={(open) => !open && setDeleteTargetIds(null)}
        onConfirm={handleConfirmDelete}
      />

      <MoveBetsDrawer
        count={moveTargetIds?.length ?? 0}
        bankrollOptions={bankrollOptions ?? []}
        open={moveTargetIds !== null}
        onOpenChange={(open) => !open && setMoveTargetIds(null)}
        onConfirm={handleConfirmMove}
      />

      <EditBetSheet
        key={editTarget?.id ?? "none"}
        bet={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={handleSaved}
        currency={currency}
        taxonomy={taxonomy}
      />
    </div>
  );
}

function DesktopHistoryTable({
  bets,
  currency,
  scopedToBankroll,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onRequestEdit,
  onRequestDelete,
}: {
  bets: HistoryBetItemData[];
  currency: Currency;
  scopedToBankroll: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRequestEdit: (id: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("history.table");
  const tResults = useTranslations("results");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");

  return (
    <div className="hidden overflow-hidden rounded-xl border border-border lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
          <thead className="bg-muted/45 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            <tr>
              {selectionMode && <th className="w-12 px-3 py-3 font-medium"><span className="sr-only">{t("select")}</span></th>}
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t("date")}</th>
              <th className="min-w-56 px-3 py-3 font-medium">{t("event")}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t("sport")}</th>
              {!scopedToBankroll && <th className="px-3 py-3 font-medium">{t("bankroll")}</th>}
              <th className="whitespace-nowrap px-3 py-3 text-right font-medium">{t("stake")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right font-medium">{t("odds")}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t("result")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right font-medium">{t("profit")}</th>
              <th className="w-24 px-3 py-3 text-right font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {bets.map((bet) => {
              const positive = bet.profit >= 0;
              const TrendIcon = positive ? TrendUp : TrendDown;
              const event = bet.description || bet.eventResult || "—";

              return (
                <tr key={bet.id} aria-selected={selectionMode ? selectedIds.has(bet.id) : undefined} className="bg-background/35 transition-colors hover:bg-muted/35">
                  {selectionMode && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onToggleSelect(bet.id)}
                        aria-pressed={selectedIds.has(bet.id)}
                        aria-label={`${t("select")} ${event}`}
                        className={selectedIds.has(bet.id) ? "flex min-h-touch min-w-touch items-center justify-center rounded border border-primary bg-primary text-primary-foreground" : "flex min-h-touch min-w-touch items-center justify-center rounded border border-input bg-background"}
                      >
                        {selectedIds.has(bet.id) ? "✓" : null}
                      </button>
                    </td>
                  )}
                  <td className="num whitespace-nowrap px-3 py-3 text-muted-foreground">{fmtDateWithYear(bet.date, locale)}</td>
                  <td className="max-w-80 px-3 py-3">
                    <span className="block truncate font-medium">{event}</span>
                    {bet.description && bet.eventResult && <span className="mt-0.5 block truncate text-muted-foreground">{bet.eventResult}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="block font-medium">{translateTaxonomy(tSports, bet.sport)}</span>
                    <span className="block text-muted-foreground">{translateTaxonomy(tBetTypes, bet.betType)}</span>
                  </td>
                  {!scopedToBankroll && <td className="max-w-32 truncate px-3 py-3 text-muted-foreground">{bet.bankrollName}</td>}
                  <td className="num whitespace-nowrap px-3 py-3 text-right">{fmtMoney(bet.stake, locale, currency)}</td>
                  <td className="num whitespace-nowrap px-3 py-3 text-right">{fmtOdds(bet.odds, locale)}</td>
                  <td className="px-3 py-3"><span className="inline-flex rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground">{tResults(bet.result)}</span></td>
                  <td className={positive ? "num whitespace-nowrap px-3 py-3 text-right font-semibold text-profit" : "num whitespace-nowrap px-3 py-3 text-right font-semibold text-loss"}>
                    {bet.result === "EN_ATTENTE" ? "—" : <span className="inline-flex items-center gap-1"><TrendIcon size={13} weight="bold" aria-hidden />{fmtMoneySigned(bet.profit, locale, currency)}</span>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => onRequestEdit(bet.id)} aria-label={t("editAriaLabel")} className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <PencilSimple size={17} aria-hidden />
                      </button>
                      <button type="button" onClick={() => onRequestDelete(bet.id)} aria-label={t("deleteAriaLabel")} className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-loss-muted hover:text-loss">
                        <TrashSimple size={17} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
