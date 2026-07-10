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
        <ul className="flex flex-col gap-3">
          {bankrolls.map((br, i) => (
            <li
              key={br.id}
              className="glass-card flex items-center gap-2 rounded-xl p-4 animate-fade-in-up"
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              <Link
                href={`/bankrolls/${br.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1"
              >
                <div className="flex flex-col">
                  <span className="truncate text-sm font-medium">
                    {br.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {br.bookmaker}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num text-lg font-semibold">
                    {fmtMoney(br.balance, locale, currency)}
                  </span>
                  <TrendBadge
                    value={br.profit}
                    label={fmtMoneySigned(br.profit, locale, currency)}
                    upLabel={tCommon("trendUp")}
                    downLabel={tCommon("trendDown")}
                  />
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
                className="min-h-touch min-w-touch rounded-lg text-muted-foreground"
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
