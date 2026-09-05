export type ReferencePeriod = {
  referenceCapital: number | null;
  effectiveFrom: Date;
};

/** Unknown historical references deliberately produce no units. */
export function referenceAt(periods: ReferencePeriod[], date: Date): number | null {
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_REFERENCE_DATE");
  const period = periods.filter((item) => item.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
  return period?.referenceCapital ?? null;
}

export function toUnits(amount: number, referenceCapital: number | null): number | null {
  if (!Number.isFinite(amount)) throw new Error("INVALID_AMOUNT");
  if (referenceCapital === null) return null;
  if (!Number.isFinite(referenceCapital) || referenceCapital <= 0) throw new Error("INVALID_REFERENCE");
  const units = (amount / referenceCapital) * 100;
  if (!Number.isFinite(units) || Math.abs(units) > Number.MAX_SAFE_INTEGER / 1e8) throw new Error("AMOUNT_OUT_OF_RANGE");
  return Math.round(units * 1e8) / 1e8;
}

export function unitSnapshot(stake: number, periods: ReferencePeriod[], date: Date, recordedAt = new Date()) {
  const referenceCapitalAtBet = referenceAt(periods, date);
  return { referenceCapitalAtBet, stakeUnits: toUnits(stake, referenceCapitalAtBet), unitsRecordedAt: recordedAt };
}

export function referenceDateForImport(date: Date, pending: boolean, historicalFile: boolean, now: Date) {
  // A pending bet entered today (or for a future event) uses today's chosen
  // reference. Historical files and earlier dates require a known period.
  if (pending && !historicalFile && date.toISOString().slice(0, 10) >= now.toISOString().slice(0, 10)) return now;
  return date;
}

export function personalStake(units: number, reference: number, unitPercent = 1, rounding = 0) {
  if (![units, reference, unitPercent, rounding].every(Number.isFinite)
    || units < 0 || reference <= 0 || unitPercent <= 0 || unitPercent > 100 || rounding < 0) {
    throw new Error("INVALID_STAKING_SETTINGS");
  }
  const amount = units * reference * unitPercent / 100;
  if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER / 1e8) throw new Error("AMOUNT_OUT_OF_RANGE");
  const rounded = rounding > 0 ? Math.floor((amount + 1e-10) / rounding) * rounding : amount;
  return { amount, rounded: Math.round(rounded * 1e8) / 1e8 };
}
