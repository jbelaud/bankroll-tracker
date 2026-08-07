"use client";

import { useMemo, useState } from "react";
import type { Currency } from "@prisma/client";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { currencySymbol } from "@/lib/format";

type Entry = { date: string; profit: number; count: number };

export function ProfitCalendar({
  entries,
  currency,
}: {
  entries: Entry[];
  currency: Currency;
}) {
  const locale = useLocale();
  const t = useTranslations("stats.calendar");
  const latestEntry = entries.at(-1);
  const [month, setMonth] = useState(() => {
    const date = latestEntry ? new Date(`${latestEntry.date}T12:00:00`) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(1 - ((firstDay.getDay() + 6) % 7));

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey));
  const monthProfit = monthEntries.reduce((sum, entry) => sum + entry.profit, 0);
  const monthCount = monthEntries.reduce((sum, entry) => sum + entry.count, 0);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, index + 1))
  );
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <section className="glass-card rounded-xl p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() =>
              setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))
            }
            className="rounded-md border border-border p-1 transition-colors hover:bg-muted"
          >
            <CaretLeft size={14} />
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() =>
              setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))
            }
            className="rounded-md border border-border p-1 transition-colors hover:bg-muted"
          >
            <CaretRight size={14} />
          </button>
        </div>
      </div>

      <p className="mb-2 text-center text-xs font-semibold capitalize">{label}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] text-muted-foreground">
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const entry = byDate.get(key);
          const currentMonth = day.getMonth() === month.getMonth();

          return (
            <div
              key={key}
              title={
                entry
                  ? t("dayTooltip", {
                      profit: `${entry.profit.toFixed(2)}${currencySymbol(currency)}`,
                      count: entry.count,
                    })
                  : undefined
              }
              className={`flex aspect-square flex-col justify-center rounded-md text-center text-[0.65rem] ${
                currentMonth ? "bg-muted/40" : "opacity-30"
              } ${entry ? (entry.profit >= 0 ? "text-profit" : "text-loss") : ""}`}
            >
              <span>{day.getDate()}</span>
              {entry && (
                <span className="num text-[0.55rem]">
                  {entry.profit >= 0 ? "+" : ""}
                  {entry.profit.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2">
          {t("monthProfit")}
          <strong className={monthProfit >= 0 ? "block text-profit" : "block text-loss"}>
            {monthProfit >= 0 ? "+" : ""}
            {monthProfit.toFixed(2)}
            {currencySymbol(currency)}
          </strong>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          {t("monthBets")}
          <strong className="block">{monthCount}</strong>
        </div>
      </div>
    </section>
  );
}
