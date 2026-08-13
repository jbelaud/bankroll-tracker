export type HistoryGroupEntry = {
  id: string;
  date: Date;
  profit: number;
};

export type HistoryDayGroup<T extends HistoryGroupEntry> = {
  key: string;
  label: string;
  profit: number;
  bets: T[];
};

export type HistoryWeekGroup<T extends HistoryGroupEntry> = {
  key: string;
  start: Date;
  end: Date;
  profit: number;
  betCount: number;
  days: HistoryDayGroup<T>[];
};

export type HistoryMonthGroup<T extends HistoryGroupEntry> = {
  key: string;
  label: string;
  profit: number;
  betCount: number;
  weeks: HistoryWeekGroup<T>[];
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

function endOfWeek(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Builds the history hierarchy in the viewer's local time zone. A week that
 * straddles two months is deliberately shown in both relevant month sections.
 */
export function groupHistoryBets<T extends HistoryGroupEntry>(bets: T[], locale: string): HistoryMonthGroup<T>[] {
  const byMonth = new Map<
    string,
    {
      label: string;
      profit: number;
      betCount: number;
      weeks: Map<
        string,
        {
          start: Date;
          end: Date;
          profit: number;
          betCount: number;
          days: Map<string, HistoryDayGroup<T>>;
        }
      >;
    }
  >();

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  for (const bet of bets) {
    const key = monthKey(bet.date);
    const weekStart = startOfWeek(bet.date);
    const weekKey = localDateKey(weekStart);
    const dayKey = localDateKey(bet.date);
    const month = byMonth.get(key) ?? {
      label: monthFormatter.format(bet.date),
      profit: 0,
      betCount: 0,
      weeks: new Map(),
    };
    const week = month.weeks.get(weekKey) ?? {
      start: weekStart,
      end: endOfWeek(weekStart),
      profit: 0,
      betCount: 0,
      days: new Map(),
    };
    const day = week.days.get(dayKey) ?? {
      key: dayKey,
      label: dayFormatter.format(bet.date),
      profit: 0,
      bets: [],
    };

    day.profit += bet.profit;
    day.bets.push(bet);
    week.profit += bet.profit;
    week.betCount += 1;
    week.days.set(dayKey, day);
    month.profit += bet.profit;
    month.betCount += 1;
    month.weeks.set(weekKey, week);
    byMonth.set(key, month);
  }

  return Array.from(byMonth.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, month]) => ({
      key,
      label: month.label,
      profit: month.profit,
      betCount: month.betCount,
      weeks: Array.from(month.weeks.entries())
        .sort(([left], [right]) => right.localeCompare(left))
        .map(([weekKey, week]) => ({
          key: weekKey,
          start: week.start,
          end: week.end,
          profit: week.profit,
          betCount: week.betCount,
          days: Array.from(week.days.values())
            .sort((left, right) => right.key.localeCompare(left.key))
            .map((day) => ({
              ...day,
              bets: day.bets.toSorted((left, right) => right.date.getTime() - left.date.getTime()),
            })),
        })),
    }));
}
