"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Plus, Wallet, LockKey, Crown } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtMoneySigned, fmtPct, fmtUnits } from "@/lib/format";
import { useDisplayUnit } from "@/components/shared/display-unit-toggle";
import {
  BankrollFormDrawer,
  type BankrollFormTarget,
} from "./bankroll-form-drawer";

export type BankrollListItem = BankrollFormTarget & {
  balance: number;
  profit: number;
  roi: number | null;
  betCount: number;
  pendingCount: number;
  settledCount: number;
  unitProfit: number | null;
  missingUnitCount: number;
  locked: boolean;
};

export function BankrollList({
  bankrolls,
  currency,
  initialCreateOpen = false,
  returnTo,
}: {
  bankrolls: BankrollListItem[];
  currency: Currency;
  initialCreateOpen?: boolean;
  returnTo?: "/scan";
}) {
  const [open, setOpen] = useState(initialCreateOpen);
  const locale = useLocale();
  const t = useTranslations("bankrolls");
  const displayUnit = useDisplayUnit();

  useEffect(() => {
    if (initialCreateOpen) {
      const params = new URLSearchParams(window.location.search);
      params.delete("create");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      );
    }
  }, [initialCreateOpen]);

  const openCreate = () => {
    setOpen(true);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          onClick={openCreate}
          className="min-h-touch w-full rounded-lg text-sm font-semibold animate-fade-in-up sm:w-auto"
        >
          <Plus size={18} weight="bold" aria-hidden />
          {t("newBankroll")}
        </Button>
      </div>

      {bankrolls.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-xl p-8 text-center animate-fade-in-up">
          <Wallet size={28} className="text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {bankrolls.map((br, i) => (
            <li
              key={br.id}
              className="glass-card relative flex min-h-48 flex-col gap-4 rounded-2xl p-4 animate-fade-in-up"
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              {br.locked ? (
                <div className="flex flex-1 flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <LockKey size={18} weight="fill" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold">{t("locked.title")}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("locked.description")}</p>
                    </div>
                  </div>
                  <Link
                    href="/account"
                    className="flex min-h-touch items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    <Crown size={16} weight="fill" aria-hidden />
                    {t("locked.cta")}
                  </Link>
                </div>
              ) : (
                <Link
                  href={`/bankrolls/${br.id}`}
                  className="group flex min-w-0 flex-1 flex-col gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  <span className="sr-only">{t("openAriaLabel", { name: br.name })}. </span>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{br.name}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {br.mode === "SINGLE" ? t("singleMode") : t("distributedMode", { count: br.allocations.length })}
                      </p>
                      {br.referenceCapital ? <p className="num mt-1 text-[0.65rem] text-primary">{t("referenceUnit", { value: fmtMoney(br.referenceCapital / 100, locale, currency) })}</p> : null}
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary group-focus-visible:bg-primary/10 group-focus-visible:text-primary">
                      <ArrowRight size={17} weight="bold" aria-hidden />
                    </span>
                  </div>

                  <div>
                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">{t("balance")}</span>
                    <p className="num mt-1 text-2xl font-semibold tracking-tight">
                      {fmtMoney(br.balance, locale, currency)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div className="min-w-0">
                      <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("profit")}</span>
                      <strong className={displayUnit === "units" && br.unitProfit === null ? "num mt-1 block truncate text-xs" : br.profit >= 0 ? "num mt-1 block truncate text-xs text-profit" : "num mt-1 block truncate text-xs text-loss"}>
                        {displayUnit === "units" ? br.unitProfit === null ? "—" : fmtUnits(br.unitProfit, locale, true) : fmtMoneySigned(br.profit, locale, currency)}
                      </strong>
                      {displayUnit === "units" && br.missingUnitCount > 0 ? <span className="mt-0.5 block text-[0.6rem] text-warning">{t("missingUnits", { count: br.missingUnitCount })}</span> : null}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("roi")}</span>
                      <strong className={br.roi === null ? "num mt-1 block text-xs" : br.roi >= 0 ? "num mt-1 block text-xs text-profit" : "num mt-1 block text-xs text-loss"}>
                        {br.roi === null ? "—" : fmtPct(br.roi, locale)}
                      </strong>
                      <span className="mt-0.5 block text-[0.6rem] text-muted-foreground">{t("capitalPerformance")}: {br.initial > 0 ? fmtPct((br.profit / br.initial) * 100, locale) : "—"}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("allBets")}</span>
                      <strong className="num mt-1 block text-xs">{br.betCount}</strong>
                      <span className="mt-0.5 block text-[0.6rem] text-muted-foreground">{t("performanceBets", { count: br.settledCount })}</span>
                      {br.pendingCount > 0 ? <span className="mt-0.5 block text-[0.6rem] text-warning">{t("pendingShort", { count: br.pendingCount })}</span> : null}
                      {br.betCount - br.settledCount - br.pendingCount > 0 ? <span className="mt-0.5 block text-[0.6rem] text-muted-foreground">{t("refundedCount", { count: br.betCount - br.settledCount - br.pendingCount })}</span> : null}
                    </div>
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <BankrollFormDrawer
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
        currency={currency}
        returnTo={returnTo}
      />
    </div>
  );
}
