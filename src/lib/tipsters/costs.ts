import type { Currency } from "@prisma/client";

export type TipsterCostState = "UNKNOWN" | "FREE" | "PAID";
export type TipsterCostFrequencyValue =
  | "ONE_TIME"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export type TipsterCostPeriodLike = {
  kind: "FREE" | "PAID";
  amount: number | null;
  currency: Currency;
  frequency: TipsterCostFrequencyValue | null;
  startDate: Date;
  endDate: Date | null;
};

export type TipsterCostSummary = {
  state: TipsterCostState;
  configured: boolean;
  serviceCost: number | null;
  chargeCount: number;
  currency: Currency | null;
};

const DAY_MS = 86_400_000;

function utcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function lastDayOfUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function monthlyAnniversary(anchor: Date, monthOffset: number): Date {
  const absoluteMonth = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth() + monthOffset;
  const year = Math.floor(absoluteMonth / 12);
  const month = absoluteMonth % 12;
  const day = Math.min(anchor.getUTCDate(), lastDayOfUtcMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function periodBounds(
  period: TipsterCostPeriodLike,
  from: Date,
  to: Date
): { from: Date; to: Date } | null {
  const start = utcDay(period.startDate);
  const end = period.endDate ? utcDay(period.endDate) : to;
  const intersectionFrom = new Date(Math.max(start.getTime(), from.getTime()));
  const intersectionTo = new Date(Math.min(end.getTime(), to.getTime()));
  return intersectionFrom <= intersectionTo
    ? { from: intersectionFrom, to: intersectionTo }
    : null;
}

export function countTipsterCostCharges(
  period: TipsterCostPeriodLike,
  range: { from: Date; to: Date }
): number {
  if (period.kind !== "PAID" || !period.frequency || !period.amount) return 0;

  const from = utcDay(range.from);
  const to = utcDay(range.to);
  const bounds = periodBounds(period, from, to);
  if (!bounds) return 0;

  const anchor = utcDay(period.startDate);
  if (period.frequency === "ONE_TIME") {
    return anchor >= bounds.from && anchor <= bounds.to ? 1 : 0;
  }

  if (period.frequency === "WEEKLY") {
    const elapsedDays = Math.max(0, Math.ceil((bounds.from.getTime() - anchor.getTime()) / DAY_MS));
    let chargeDate = addUtcDays(anchor, Math.ceil(elapsedDays / 7) * 7);
    let count = 0;
    while (chargeDate <= bounds.to) {
      count += 1;
      chargeDate = addUtcDays(chargeDate, 7);
    }
    return count;
  }

  const intervalMonths = period.frequency === "MONTHLY"
    ? 1
    : period.frequency === "QUARTERLY"
      ? 3
      : 12;
  const roughMonthOffset = Math.max(
    0,
    (bounds.from.getUTCFullYear() - anchor.getUTCFullYear()) * 12
      + bounds.from.getUTCMonth()
      - anchor.getUTCMonth()
      - 1
  );
  let occurrence = Math.floor(roughMonthOffset / intervalMonths);
  let chargeDate = monthlyAnniversary(anchor, occurrence * intervalMonths);
  while (chargeDate < bounds.from) {
    occurrence += 1;
    chargeDate = monthlyAnniversary(anchor, occurrence * intervalMonths);
  }

  let count = 0;
  while (chargeDate <= bounds.to) {
    count += 1;
    occurrence += 1;
    chargeDate = monthlyAnniversary(anchor, occurrence * intervalMonths);
  }
  return count;
}

export function getCurrentTipsterCostState(
  periods: TipsterCostPeriodLike[],
  today = new Date()
): TipsterCostState {
  const day = utcDay(today);
  const current = periods
    .filter((period) => {
      const start = utcDay(period.startDate);
      const end = period.endDate ? utcDay(period.endDate) : null;
      return start <= day && (!end || end >= day);
    })
    .toSorted((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
  return current?.kind ?? "UNKNOWN";
}

// Règle volontairement explicite : chaque fréquence génère une charge pleine
// à sa date anniversaire. Aucun prorata calendaire implicite n'est appliqué.
export function calculateTipsterServiceCost(
  periods: TipsterCostPeriodLike[],
  range: { from: Date; to: Date },
  today = new Date()
): TipsterCostSummary {
  if (periods.length === 0) {
    return {
      state: "UNKNOWN",
      configured: false,
      serviceCost: null,
      chargeCount: 0,
      currency: null,
    };
  }

  let total = 0;
  let chargeCount = 0;
  for (const period of periods) {
    const count = countTipsterCostCharges(period, range);
    chargeCount += count;
    total += count * (period.amount ?? 0);
  }

  return {
    state: getCurrentTipsterCostState(periods, today),
    configured: true,
    serviceCost: roundMoney(total),
    chargeCount,
    currency: periods.at(-1)?.currency ?? null,
  };
}

