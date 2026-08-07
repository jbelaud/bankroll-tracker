"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, PencilSimple, Wallet } from "@phosphor-icons/react";
import type { Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { TrendBadge } from "@/components/dashboard/trend-badge";
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
};

export function BankrollList({
  bankrolls,
  currency,
}: {
  bankrolls: BankrollListItem[];
  currency: Currency;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankrollFormTarget | undefined>();
  const locale = useLocale();
  const t = useTranslations("bankrolls");
  const tCommon = useTranslations("common");

  const openCreate = () => {
    setEditing(undefined);
    setOpen(true);
  };
  const openEdit = (br: BankrollFormTarget) => {
    setEditing(br);
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
                  <div>
                    <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("profit")}</span>
                    <TrendBadge value={br.profit} label={fmtMoneySigned(br.profit, locale, currency)} upLabel={tCommon("trendUp")} downLabel={tCommon("trendDown")} />
                  </div>
                  <div>
                    <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("roi")}</span>
                    <strong className={br.profit >= 0 ? "num text-xs text-profit" : "num text-xs text-loss"}>
                      {br.initial > 0 ? `${br.profit >= 0 ? "+" : ""}${((br.profit / br.initial) * 100).toFixed(1)}%` : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[0.6rem] uppercase tracking-wide text-muted-foreground">{t("bets")}</span>
                    <strong className="num text-xs">{br.betCount}</strong>
                    {br.pendingCount > 0 && <span className="ml-1 text-[0.6rem] text-warning">{t("pendingShort", { count: br.pendingCount })}</span>}
                  </div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("editAriaLabel", { name: br.name })}
                onClick={() =>
                  openEdit({
                    id: br.id,
                    name: br.name,
                    bookmaker: br.bookmaker,
                    initial: br.initial,
                  })
                }
                className="absolute right-3 top-3 min-h-touch min-w-touch rounded-lg text-muted-foreground"
              >
                <PencilSimple size={18} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <BankrollFormDrawer
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        bankroll={editing}
        currency={currency}
      />
    </div>
  );
}
