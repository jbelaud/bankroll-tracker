import type { Bet } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { computeDetailedStats } from "./detailed-stats";

function bet(id: string, day: string, result: Bet["result"], stakeUnits: number | null, odds = 2): Bet {
  return {
    id, bankrollId: "bankroll", allocationId: null, bookmaker: null, ticketRef: null,
    date: new Date(day), sport: "Football", betType: "Simple", description: null, eventResult: null,
    stake: stakeUnits ?? 1, stakeUnits, referenceCapitalAtBet: 100, unitsRecordedAt: null,
    odds, boosted: false, originalOdds: null, freebet: false, live: false, result,
    cashOutAmount: null, createdAt: new Date(day), updatedAt: new Date(day),
    entryMethod: "FILE", format: "SIMPLE", closingOdds: null, estimatedProbability: null,
    tipsterId: null, importBatchId: null, scanUsageId: null,
    initialProofAt: null, initialProofBeforeEvent: null, resultProofAt: null,
    resultEntryMethod: "UNKNOWN", certificationLockedAt: null,
  };
}

describe("detailed performance", () => {
  it("counts results and computes a peak-to-trough drawdown in bet order", () => {
    const bets = [
      bet("last", "2026-09-04T12:00:00Z", "PERDU", 1),
      bet("first", "2026-09-01T12:00:00Z", "GAGNE", 2, 3),
      bet("middle", "2026-09-03T12:00:00Z", "PERDU", 2),
      bet("pending", "2026-09-05T12:00:00Z", "EN_ATTENTE", 1),
      bet("refunded", "2026-09-06T12:00:00Z", "REMBOURSE", 1),
    ];
    const details = computeDetailedStats(bets);
    expect(details.successRate).toBeCloseTo(100 / 3);
    expect(details).toMatchObject({
      won: 1, lost: 2, refunded: 1, pending: 1,
      playedStake: 5, playedStakeUnits: 5, pendingStake: 1, pendingStakeUnits: 1,
      maxStake: 2, maxStakeUnits: 2, maxWinningOdds: 3,
      drawdown: 3, drawdownUnits: 3,
    });
  });

  it("does not infer unit totals or drawdown from incomplete historical units", () => {
    const details = computeDetailedStats([
      bet("known", "2026-09-01T12:00:00Z", "GAGNE", 1),
      bet("unknown", "2026-09-02T12:00:00Z", "PERDU", null),
    ]);
    expect(details).toMatchObject({
      playedStakeUnits: null, maxStakeUnits: null, drawdownUnits: null, missingUnits: 1,
    });
  });

  it("keeps known stakes in units when a cash-out lacks a conversion snapshot", () => {
    const cashout = { ...bet("cashout", "2026-09-01T12:00:00Z", "CASHE", 1), referenceCapitalAtBet: null };
    expect(computeDetailedStats([cashout])).toMatchObject({
      playedStakeUnits: 1, maxStakeUnits: 1, drawdownUnits: null, missingUnits: 1,
    });
  });
});
