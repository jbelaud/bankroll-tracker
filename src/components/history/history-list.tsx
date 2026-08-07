"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { BetResult, Currency } from "@prisma/client";
import { CalendarX, X } from "@phosphor-icons/react";
import { deleteBet, deleteBets } from "@/lib/actions/bets";
import { currencySymbol } from "@/lib/format";
import { computeProfit } from "@/lib/profit";
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

  // Un seul item peut être ouvert en swipe à la fois (voir history-bet-item.tsx
  // pour la coordination swipe / appui long).
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [editTarget, setEditTarget] = useState<HistoryBetItemData | null>(null);

  const sportOptions = useMemo(
    () => Array.from(new Set(bets.map((b) => b.sport))).sort(),
    [bets]
  );

  const filteredBets = useMemo(
    () =>
      bets.filter(
        (b) => (!sport || b.sport === sport) && (!bankroll || b.bankrollId === bankroll)
      ),
    [bets, sport, bankroll]
  );

  const groupedBets = useMemo(() => {
    const byMonth = new Map<
      string,
      {
        label: string;
        days: Map<string, { label: string; profit: number; bets: HistoryBetItemData[] }>;
      }
    >();

    for (const bet of filteredBets) {
      const monthKey = `${bet.date.getFullYear()}-${String(bet.date.getMonth() + 1).padStart(2, "0")}`;
      const dayKey = bet.date.toISOString().slice(0, 10);
      const month = byMonth.get(monthKey) ?? {
        label: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(bet.date),
        days: new Map(),
      };
      const day = month.days.get(dayKey) ?? {
        label: new Intl.DateTimeFormat(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(bet.date),
        profit: 0,
        bets: [],
      };

      day.profit += bet.profit;
      day.bets.push(bet);
      month.days.set(dayKey, day);
      byMonth.set(monthKey, month);
    }

    return Array.from(byMonth.entries()).map(([key, month]) => ({
      key,
      label: month.label,
      days: Array.from(month.days.entries()).map(([dayKey, day]) => ({
        key: dayKey,
        ...day,
      })),
    }));
  }, [filteredBets, locale]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
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
          sportOptions={sportOptions}
          bankrollOptions={scopedToBankroll ? undefined : bankrollOptions}
          onSportChange={setSport}
          onBankrollChange={setBankroll}
        />
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
              <h2 className="bg-muted/40 px-3 py-2 text-sm font-semibold capitalize">
                {month.label}
              </h2>
              <div className="flex flex-col gap-3 p-2">
                {month.days.map((day) => (
                  <div key={day.key}>
                    <div className="flex items-center justify-between px-1 pb-1.5 text-xs">
                      <h3 className="font-medium capitalize text-muted-foreground">{day.label}</h3>
                      <span className={day.profit >= 0 ? "num font-semibold text-profit" : "num font-semibold text-loss"}>
                        {day.profit >= 0 ? "+" : ""}{day.profit.toFixed(2)}{currencySymbol(currency)}
                      </span>
                    </div>
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
                  </div>
                ))}
              </div>
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
