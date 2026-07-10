"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PencilSimple, Target, X } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fmtMoney, currencySymbol } from "@/lib/format";
import { updateGoals } from "@/lib/actions/account";

// Distinct de src/components/dashboard/goals-card.tsx (lecture seule,
// utilisé sur le Dashboard) : ici il faut un mode édition, une petite
// duplication de markup est préférable à complexifier un composant qui
// fonctionne déjà ailleurs.
export function AccountGoalsCard({
  monthProfit,
  initialProfitGoal,
  initialLossLimit,
  currency,
}: {
  monthProfit: number;
  initialProfitGoal: number;
  initialLossLimit: number;
  currency: Currency;
}) {
  const [profitGoal, setProfitGoal] = useState(initialProfitGoal);
  const [lossLimit, setLossLimit] = useState(initialLossLimit);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profitInput, setProfitInput] = useState(String(initialProfitGoal || ""));
  const [lossInput, setLossInput] = useState(String(initialLossLimit || ""));
  const locale = useLocale();
  const t = useTranslations("common.goals");
  const tAccount = useTranslations("account.goals");
  const tCommon = useTranslations("common");
  const symbol = currencySymbol(currency);

  const hasGoal = profitGoal > 0;
  const hasLimit = lossLimit > 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const nextProfitGoal = Number(profitInput) || 0;
    const nextLossLimit = Number(lossInput) || 0;
    try {
      await updateGoals(nextProfitGoal, nextLossLimit);
      setProfitGoal(nextProfitGoal);
      setLossLimit(nextLossLimit);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon("unexpectedError"));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <section aria-label={t("title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Target size={15} className="text-primary" aria-hidden />
            {t("title")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tAccount("cancelAriaLabel")}
            onClick={() => setEditing(false)}
            className="min-h-touch min-w-touch rounded-lg text-muted-foreground"
          >
            <X size={16} aria-hidden />
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profit-goal" className="text-xs">
            {tAccount("profitGoalLabel", { currency: symbol })}
          </Label>
          <Input
            id="profit-goal"
            type="number"
            step="1"
            min="0"
            inputMode="decimal"
            value={profitInput}
            onChange={(e) => setProfitInput(e.target.value)}
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loss-limit" className="text-xs">
            {tAccount("lossLimitLabel", { currency: symbol })}
          </Label>
          <Input
            id="loss-limit"
            type="number"
            step="1"
            min="0"
            inputMode="decimal"
            value={lossInput}
            onChange={(e) => setLossInput(e.target.value)}
            className="num min-h-touch rounded-lg px-3 text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-loss">
            {error}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-h-touch w-full rounded-lg text-sm font-semibold"
        >
          {saving ? tAccount("saving") : tCommon("save")}
        </Button>
      </section>
    );
  }

  if (!hasGoal && !hasLimit) {
    return (
      <section
        aria-label={t("title")}
        className="glass-card flex items-center justify-between rounded-xl p-4"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target size={15} aria-hidden />
          {tAccount("noneSet")}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="min-h-touch text-xs font-medium text-primary"
        >
          {tAccount("defineLink")}
        </button>
      </section>
    );
  }

  const profitPct = hasGoal ? Math.max(0, Math.min(100, (monthProfit / profitGoal) * 100)) : 0;
  const lossPct = hasLimit
    ? Math.max(0, Math.min(100, (Math.abs(Math.min(0, monthProfit)) / lossLimit) * 100))
    : 0;
  const lossBreached = hasLimit && monthProfit < 0 && Math.abs(monthProfit) >= lossLimit;

  return (
    <section aria-label={t("title")} className="glass-card flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Target size={15} className="text-primary" aria-hidden />
          {t("title")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tAccount("editAriaLabel")}
          onClick={() => setEditing(true)}
          className="min-h-touch min-w-touch rounded-lg text-muted-foreground"
        >
          <PencilSimple size={15} aria-hidden />
        </Button>
      </div>

      {hasGoal && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t("profitLabel")}
              <span className="num text-foreground">{fmtMoney(monthProfit, locale, currency)}</span>
            </span>
            <span className="num text-muted-foreground">
              {t("goalPrefix", { amount: fmtMoney(profitGoal, locale, currency) })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(profitPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("profitAriaLabel")}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-profit transition-all" style={{ width: `${profitPct}%` }} />
          </div>
        </div>
      )}

      {hasLimit && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className={lossBreached ? "font-medium text-loss" : "text-muted-foreground"}>
              {lossBreached ? t("lossBreachedLabel") : t("lossLabel")} :{" "}
              <span className="num">{fmtMoney(Math.min(0, monthProfit), locale, currency)}</span>
            </span>
            <span className="num text-muted-foreground">
              {t("limitPrefix", { amount: fmtMoney(lossLimit, locale, currency) })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(lossPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("lossAriaLabel")}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full transition-all ${lossBreached ? "bg-loss" : "bg-chart-4"}`}
              style={{ width: `${lossPct}%` }}
            />
          </div>
          {lossBreached && (
            <p className="mt-1 text-xs text-loss">{t("breachedMessage")}</p>
          )}
        </div>
      )}
    </section>
  );
}
