import type { Bankroll, BankrollMovement, Bet } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { summarizeBankrollCapital } from "./bankroll-balance";

const bankroll = { id: "bankroll-1", initial: 100 } as Bankroll;

function bet(overrides: Partial<Bet>): Bet {
  return {
    id: "bet-1", bankrollId: "bankroll-1", allocationId: null, bookmaker: null, ticketRef: null, date: new Date(), sport: "Football", betType: "1N2", description: null, eventResult: null,
    stake: 10, odds: 2, boosted: false, originalOdds: null, freebet: false, live: false, result: "GAGNE", cashOutAmount: null, createdAt: new Date(), entryMethod: "UNKNOWN", format: "SIMPLE", closingOdds: null, tipsterId: null, importBatchId: null, scanUsageId: null,
    ...overrides,
  };
}

function movement(type: BankrollMovement["type"], amount: number): BankrollMovement {
  return { id: `${type}-${amount}`, bankrollId: "bankroll-1", allocationId: null, type, amount, note: null, date: new Date(), createdAt: new Date() };
}

describe("summarizeBankrollCapital", () => {
  it("keeps deposits and withdrawals separate from betting profit", () => {
    const summary = summarizeBankrollCapital(
      bankroll,
      [bet({ result: "GAGNE" }), bet({ id: "bet-2", result: "PERDU", stake: 5 })],
      [movement("DEPOSIT", 50), movement("WITHDRAWAL", 20)]
    );

    expect(summary).toMatchObject({
      deposits: 50,
      withdrawals: 20,
      netFunding: 130,
      profit: 5,
      balance: 135,
    });
    expect(summary.performancePct).toBeCloseTo(5 / 130 * 100);
  });

  it("does not treat pending bets as a gain or loss", () => {
    const summary = summarizeBankrollCapital(bankroll, [bet({ result: "EN_ATTENTE" })], []);
    expect(summary).toMatchObject({ netFunding: 100, profit: 0, balance: 100, performancePct: 0 });
  });
});
