"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { BetResult, Currency } from "@prisma/client";
import { CalendarX, X } from "@phosphor-icons/react";
import { deleteBet, deleteBets } from "@/lib/actions/bets";
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
        <ul className="glass-card divide-y divide-border overflow-hidden rounded-xl">
          {filteredBets.map((bet) => (
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
