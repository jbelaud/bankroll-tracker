"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  TrendUp,
  TrendDown,
  Lightning,
  Gift,
  Radio,
  TrashSimple,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { fmtDateWithYear, fmtMoney, fmtMoneySigned, fmtOdds } from "@/lib/format";
import { translateTaxonomy } from "@/lib/i18n/taxonomy";
import type { HistoryBetItemData } from "./history-list";

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD = 10;
const OPEN_TRANSLATE = -80;
const OPEN_THRESHOLD = -40;

type GestureMode = "pending" | "swipe" | "scroll" | "longpress";

// Un seul jeu de handlers pointeur gère swipe-to-delete ET appui long sans
// conflit : le mouvement horizontal annule le timer d'appui long dès qu'il
// dépasse le seuil, l'immobilité laisse le timer aboutir. Voir la note dans
// history-list.tsx pour le détail de la coordination entre items.
export function HistoryBetItem({
  bet,
  selectionMode,
  selected,
  isOpen,
  showBankrollName = true,
  onOpenChange,
  onToggleSelect,
  onEnterSelection,
  onRequestDelete,
  onRequestEdit,
  currency,
}: {
  bet: HistoryBetItemData;
  selectionMode: boolean;
  selected: boolean;
  isOpen: boolean;
  // false sur l'écran Détail bankroll : le nom de la bankroll serait répété
  // sur chaque ligne alors qu'on est déjà sur sa page.
  showBankrollName?: boolean;
  onOpenChange: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  onEnterSelection: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onRequestEdit: (id: string) => void;
  currency: Currency;
}) {
  const [translateX, setTranslateX] = useState(isOpen ? OPEN_TRANSLATE : 0);
  const [isSwiping, setIsSwiping] = useState(false);
  const gesture = useRef<{
    startX: number;
    startY: number;
    mode: GestureMode;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const suppressClick = useRef(false);
  const locale = useLocale();
  const t = useTranslations("history.item");
  const tCommon = useTranslations("common");
  const tSports = useTranslations("sports");
  const tBetTypes = useTranslations("betTypes");
  const tResults = useTranslations("results");

  // Fermeture externe (un autre item vient de s'ouvrir, ou suppression annulée).
  useEffect(() => {
    if (isOpen) return;
    const frame = requestAnimationFrame(() => setTranslateX(0));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  function handlePointerDown(e: React.PointerEvent) {
    if (selectionMode) return; // le tap natif suffit en mode sélection
    const timer = setTimeout(() => {
      const g = gesture.current;
      if (g && g.mode === "pending") {
        g.mode = "longpress";
        suppressClick.current = true;
        onEnterSelection(bet.id);
      }
    }, LONG_PRESS_MS);
    gesture.current = { startX: e.clientX, startY: e.clientY, mode: "pending", timer };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || g.mode === "longpress" || g.mode === "scroll") return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.mode === "pending") {
      if (Math.abs(dx) < MOVE_THRESHOLD && Math.abs(dy) < MOVE_THRESHOLD) return;
      if (g.timer) clearTimeout(g.timer);
      if (Math.abs(dx) <= Math.abs(dy)) {
        g.mode = "scroll"; // laisse le scroll vertical natif faire son travail
        return;
      }
      g.mode = "swipe";
      setIsSwiping(true);
      onOpenChange(bet.id);
    }

    if (g.mode === "swipe") {
      setTranslateX(Math.max(OPEN_TRANSLATE, Math.min(0, dx)));
    }
  }

  function handlePointerUp() {
    const g = gesture.current;
    if (g?.timer) clearTimeout(g.timer);
    setIsSwiping(false);

    if (g?.mode === "swipe") {
      suppressClick.current = true;
      if (translateX <= OPEN_THRESHOLD) {
        setTranslateX(OPEN_TRANSLATE);
        onOpenChange(bet.id);
      } else {
        setTranslateX(0);
        onOpenChange(null);
      }
    }
    gesture.current = null;
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (selectionMode) {
      onToggleSelect(bet.id);
      return;
    }
    if (isOpen) {
      onOpenChange(null); // un tap ailleurs referme le volet révélé
      return;
    }
    if (bet.result === "EN_ATTENTE") {
      onRequestEdit(bet.id);
    }
  }

  const positive = bet.profit >= 0;
  const TrendIcon = positive ? TrendUp : TrendDown;
  const sportLabel = translateTaxonomy(tSports, bet.sport);
  const betTypeLabel = translateTaxonomy(tBetTypes, bet.betType);
  const resultTone = {
    GAGNE: "bg-profit/15 text-profit",
    PERDU: "bg-loss/15 text-loss",
    REMBOURSE: "bg-muted text-muted-foreground",
    CASHE: "bg-primary/15 text-primary",
    EN_ATTENTE: "bg-muted text-muted-foreground",
  }[bet.result];

  return (
    <li className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center">
        <button
          type="button"
          aria-label={t("deleteAriaLabel", { sport: sportLabel, betType: betTypeLabel })}
          onClick={() => onRequestDelete(bet.id)}
          className="flex min-h-touch w-full flex-col items-center justify-center gap-1 bg-loss text-white"
        >
          <TrashSimple size={16} aria-hidden />
          <span className="text-[0.65rem] font-medium">{t("deleteLabel")}</span>
        </button>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        style={{
          transform: `translateX(${translateX}px)`,
          touchAction: "pan-y",
        }}
        className={cn(
          "relative z-10 flex min-h-touch items-center gap-3 bg-background p-3 transition-transform select-none",
          isSwiping ? "duration-0" : "duration-200"
        )}
      >
        {selectionMode && (
          <span className="shrink-0 text-primary" aria-hidden>
            {selected ? (
              <CheckCircle size={20} weight="fill" />
            ) : (
              <Circle size={20} className="text-muted-foreground" />
            )}
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {sportLabel}
              <span className="text-muted-foreground"> · {betTypeLabel}</span>
            </span>
            {bet.boosted && (
              <Lightning size={13} weight="fill" className="shrink-0 text-chart-4" aria-hidden />
            )}
            {bet.freebet && (
              <Gift size={13} weight="fill" className="shrink-0 text-primary" aria-hidden />
            )}
            {bet.live && (
              <Radio size={13} weight="fill" className="shrink-0 text-loss" aria-hidden />
            )}
          </div>
          {bet.description && (
            <span className="break-words text-xs text-muted-foreground">{bet.description}</span>
          )}
          {bet.eventResult && (
            <span className="break-words text-xs text-muted-foreground">{bet.eventResult}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {fmtDateWithYear(bet.date, locale)}
            {showBankrollName && ` · ${bet.bankrollName}`}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="num text-xs text-muted-foreground">
            {bet.result === "CASHE"
              ? t("cashedOut", { amount: fmtMoney(bet.cashOutAmount ?? 0, locale, currency) })
              : t("stakeAtOdds", { stake: fmtMoney(bet.stake, locale, currency), odds: fmtOdds(bet.odds, locale) })}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", resultTone)}>
            {tResults(bet.result)}
          </span>
          {bet.result !== "EN_ATTENTE" && (
            <span
              className={cn(
                "num flex items-center gap-0.5 text-sm font-semibold",
                positive ? "text-profit" : "text-loss"
              )}
            >
              <TrendIcon size={13} weight="bold" aria-hidden />
              <span className="sr-only">{positive ? tCommon("gainSr") : tCommon("lossSr")} </span>
              {fmtMoneySigned(bet.profit, locale, currency)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
