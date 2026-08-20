"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, PencilSimple, Wallet, LockKey, Crown } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtMoneySigned } from "@/lib/format";
import {
  BankrollFormDrawer,
  type BankrollFormTarget,
} from "./bankroll-form-drawer";

export type BankrollListItem = BankrollFormTarget & {
  balance: number;
  profit: number;
  betCount: number;
  pendingCount: number;
  locked: boolean;
};

export function BankrollList({
  bankrolls,
  currency,
}: {
  bankrolls: BankrollListItem[];
  currency: Currency;
}) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("bankrolls");

  const openCreate = () => {
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={openCreate}
        className="min-h-touch w-full rounded-lg text-sm font-semibold animate-fade-in-up"
      >
        <Plus size={18} weight="bold" aria-hidden />
        {t("newBankroll")}
      </Button>

      {bankrolls.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-xl p-8 text-center animate-fade-in-up">
          <Wallet size={28} className="text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
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
                <>
                  <Link
                href={`/bankrolls/${br.id}`}
                aria-label={t("openAriaLabel", { name: br.name })}
                className="flex min-w-0 flex-1 flex-col gap-4"
              >
                <div className="min-w-0 pr-10">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{br.name}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{br.bookmaker}</p>
                  </div>
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
                    <strong className={br.profit >= 0 ? "num mt-1 block truncate text-xs text-profit" : "num mt-1 block truncate text-xs text-loss"}>
                      {fmtMoneySigned(br.profit, locale, currency)}
                    </strong>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("roi")}</span>
                    <strong className={br.profit >= 0 ? "num mt-1 block text-xs text-profit" : "num mt-1 block text-xs text-loss"}>
                      {br.initial > 0 ? `${br.profit >= 0 ? "+" : ""}${((br.profit / br.initial) * 100).toFixed(1)}%` : "—"}
                    </strong>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("bets")}</span>
                    <strong className="num mt-1 block text-xs">{br.betCount}</strong>
                    {br.pendingCount > 0 && <span className="mt-0.5 block truncate text-[0.6rem] text-warning">{t("pendingShort", { count: br.pendingCount })}</span>}
                  </div>
                </div>
              </Link>
                  <Link
                    href={`/bankrolls/${br.id}`}
                    aria-label={t("openAriaLabel", { name: br.name })}
                    className="absolute right-3 top-3 flex min-h-touch min-w-touch items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PencilSimple size={18} aria-hidden />
                  </Link>
                </>
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
      />
    </div>
  );
}
