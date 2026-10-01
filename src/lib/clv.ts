import type { Bet } from "@prisma/client";

type ClvBet = Pick<Bet, "odds" | "closingOdds" | "stake" | "stakeUnits" | "result" | "format" | "freebet" | "live">;

// A closing price must describe the same pre-match selection and market.
// Lay/system bets need their own payout model; live bets do not have a
// comparable pre-match closing line.
function comparable(bet: ClvBet) {
  return !bet.live && !bet.freebet && bet.format !== "LAY" && bet.format !== "SYSTEME"
    && bet.odds !== null && Number.isFinite(bet.odds) && bet.odds > 1
    && Number.isFinite(bet.stake) && bet.stake > 0;
}

function hasClosing(bet: ClvBet) {
  return bet.closingOdds !== null && Number.isFinite(bet.closingOdds) && bet.closingOdds > 1;
}

export function computeClv(bets: ClvBet[]) {
  const candidates = bets.filter(comparable);
  const measured = candidates.filter(hasClosing);
  const clv = (bet: ClvBet) => (bet.odds! / bet.closingOdds! - 1) * 100;
  // Bet-Analytix uses every eligible bet (and all its stake) as the
  // denominator, even when its closing price is absent. Keep coverage visible
  // alongside these BA-compatible aggregates so missing prices are explicit.
  const measuredMean = measured.length > 0 ? measured.reduce((sum, bet) => sum + clv(bet), 0) / measured.length : null;
  const mean = measuredMean !== null ? measuredMean * measured.length / candidates.length : null;
  const withUnits = candidates.filter((bet) => bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits) && bet.stakeUnits > 0);
  const totalUnits = withUnits.reduce((sum, bet) => sum + bet.stakeUnits!, 0);
  const weighted = measured.length > 0 && withUnits.length === candidates.length && totalUnits > 0
    ? measured.reduce((sum, bet) => sum + clv(bet) * bet.stakeUnits!, 0) / totalUnits : null;
  const below = measured.filter((bet) => bet.closingOdds! < bet.odds!).length;
  const above = measured.filter((bet) => bet.closingOdds! > bet.odds!).length;
  const equal = measured.length - below - above;

  const settled = candidates.filter((bet) => bet.result === "GAGNE" || bet.result === "PERDU");
  const closingSettled = settled.filter(hasClosing);
  const settledWithUnits = settled.filter((bet) => bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits) && bet.stakeUnits > 0);
  const comparisonComplete = settled.length > 0 && settledWithUnits.length === settled.length;
  const actualProfit = comparisonComplete ? settledWithUnits.reduce((sum, bet) =>
    sum + (bet.result === "GAGNE" ? bet.stakeUnits! * (bet.odds! - 1) : -bet.stakeUnits!), 0) : null;
  const closingProfit = comparisonComplete && closingSettled.length > 0 ? closingSettled.reduce((sum, bet) =>
    sum + (bet.result === "GAGNE" ? bet.stakeUnits! * (bet.closingOdds! - 1) : -bet.stakeUnits!), 0) : null;
  const settledStake = settledWithUnits.reduce((sum, bet) => sum + bet.stakeUnits!, 0);

  return {
    candidates: candidates.length,
    measured: measured.length,
    missingClosing: candidates.length - measured.length,
    mean,
    measuredMean,
    weighted,
    below,
    above,
    equal,
    settled: settled.length,
    closingSettled: closingSettled.length,
    actualProfit,
    closingProfit,
    closingRoi: closingProfit !== null && settledStake > 0 ? closingProfit / settledStake * 100 : null,
    profitGap: actualProfit !== null && closingProfit !== null && settled.length === closingSettled.length
      ? actualProfit - closingProfit : null,
  };
}

type ClvComparisonBet = ClvBet & Pick<Bet, "date">;

/** Two cumulative profit lines over exactly the same settled selections. */
export function compareClvSeries(bets: ClvComparisonBet[]) {
  const eligible = bets.filter((bet) => comparable(bet) && (bet.result === "GAGNE" || bet.result === "PERDU"));
  const withClosing = eligible.filter(hasClosing);
  const comparableWithUnits = withClosing
    .filter((bet) => bet.stakeUnits !== null && Number.isFinite(bet.stakeUnits) && bet.stakeUnits > 0)
    .toSorted((left, right) => left.date.getTime() - right.date.getTime());
  let actual = 0;
  let atClosing = 0;
  const points = comparableWithUnits.map((bet, index) => {
    const units = bet.stakeUnits!;
    actual += bet.result === "GAGNE" ? units * (bet.odds! - 1) : -units;
    atClosing += bet.result === "GAGNE" ? units * (bet.closingOdds! - 1) : -units;
    return { order: index + 1, date: bet.date.toISOString(), actual, atClosing };
  });
  return {
    eligible: eligible.length,
    withClosing: withClosing.length,
    missingClosing: eligible.length - withClosing.length,
    missingUnits: withClosing.length - comparableWithUnits.length,
    points,
  };
}
