import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SPORTS } from "@/lib/sports";
import type { CreateOwnedBetInput, BetValidationMessages } from "./create";

const mocks = vi.hoisted(() => ({
  owner: vi.fn(), locked: vi.fn(), allocations: vi.fn(), transaction: vi.fn(), committed: vi.fn(),
  lock: vi.fn(), state: vi.fn(), periods: vi.fn(), scans: vi.fn(), bets: vi.fn(), selections: vi.fn(),
  taxonomy: vi.fn(), outsideTaxonomy: vi.fn(),
  singleBet: vi.fn(), singleScan: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: mocks.locked }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  bankroll: { findFirst: mocks.owner }, bankrollAllocation: { findMany: mocks.allocations },
  userTaxonomyEntry: { createMany: mocks.outsideTaxonomy }, $transaction: mocks.transaction,
} }));

const { createOwnedBets } = await import("./create-batch");
const { createOwnedBet } = await import("./create");
const messages: BetValidationMessages = {
  bankrollNotFound: "owner", bankrollLocked: "locked", stakePositive: "stake", invalidResult: "result",
  oddsPositive: "odds", closingOddsPositive: "closing", estimatedProbabilityRange: "probability", taxonomyMismatch: "taxonomy",
};
const options = { bankrollValidated: true, taxonomy: SPORTS };
const scanAt = new Date("2026-10-15T10:00:00Z");
function input(overrides: Partial<CreateOwnedBetInput> = {}): CreateOwnedBetInput {
  return {
    bankrollId: "bankroll-1", sport: "Football", betType: "Résultat du match", description: "Paris gagne",
    stake: 10, odds: 2, boosted: false, originalOdds: null, freebet: false, live: false,
    result: "EN_ATTENTE", cashOutAmount: null, ticketRef: "TICKET-1", date: new Date("2026-09-25"), eventResult: null,
    source: {
      entryMethod: "SCAN", scanUsageId: "scan-1", ticketCurrency: "EUR", expectedReferenceCapital: 1000,
      eventStartAt: new Date("2026-10-16T10:00:00Z"),
    },
    ...overrides,
  };
}

describe("batch bet creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(scanAt);
    mocks.owner.mockResolvedValue({ id: "bankroll-1" });
    mocks.locked.mockResolvedValue(false);
    mocks.allocations.mockResolvedValue([{ id: "allocation-1" }]);
    mocks.lock.mockResolvedValue([]);
    mocks.state.mockResolvedValue({
      isPublic: true, certificationStartedAt: new Date("2026-10-01"), currency: "EUR", referenceCurrency: "EUR",
    });
    mocks.periods.mockResolvedValue([{ referenceCapital: 1000, effectiveFrom: new Date("2026-01-01") }]);
    mocks.scans.mockResolvedValue([{ id: "scan-1", createdAt: scanAt }]);
    mocks.singleScan.mockResolvedValue({ createdAt: scanAt });
    mocks.singleBet.mockImplementation(async ({ data }) => ({ id: "single-bet", ...data }));
    mocks.bets.mockResolvedValue({ count: 1 });
    mocks.selections.mockResolvedValue({ count: 1 });
    mocks.taxonomy.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (run) => {
      const result = await run({
        $queryRaw: mocks.lock, bankroll: { findUniqueOrThrow: mocks.state },
        bankrollReferencePeriod: { findMany: mocks.periods }, scanUsage: { findMany: mocks.scans, findFirst: mocks.singleScan },
        bet: { createMany: mocks.bets, create: mocks.singleBet }, betSelection: { createMany: mocks.selections },
        userTaxonomyEntry: { createMany: mocks.taxonomy },
      });
      mocks.committed();
      return result;
    });
  });
  afterEach(() => vi.useRealTimers());

  it("inserts 100 new bets with one lock, one shared read per table and one INSERT", async () => {
    const tickets = Array.from({ length: 100 }, (_, i) => input({ ticketRef: `T-${i}` }));
    expect(await createOwnedBets("user-1", tickets, messages, options)).toBe(100);
    for (const query of [mocks.transaction, mocks.lock, mocks.state, mocks.periods, mocks.scans, mocks.bets]) {
      expect(query).toHaveBeenCalledTimes(1);
    }
    const rows = mocks.bets.mock.calls[0][0].data;
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map((row: { id: string }) => row.id)).size).toBe(100);
    expect(rows[0]).toMatchObject({ stake: 10, stakeUnits: 1, referenceCapitalAtBet: 1000, sourceStakeAmount: 10 });
    expect(mocks.scans).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["scan-1"] }, userId: "user-1", outcome: "READY" },
    }));
  });

  it("preserves pending and settled Scan proofs, refunds and converted cashouts", async () => {
    const tickets = [
      input(), input({ result: "GAGNE" }), input({ result: "REMBOURSE", odds: null }),
      input({ result: "CASHE", cashOutAmount: 15 }),
      input({ result: "PERDU", source: { entryMethod: "MANUAL" } }),
    ];
    await createOwnedBets("user-1", tickets, messages, options);
    const rows = mocks.bets.mock.calls[0][0].data;
    expect(rows[0]).toMatchObject({ initialProofAt: scanAt, initialProofBeforeEvent: true, resultEntryMethod: "UNKNOWN" });
    expect(rows[1]).toMatchObject({ resultProofAt: scanAt, resultEntryMethod: "SCAN" });
    expect(rows[2]).toMatchObject({ odds: null, result: "REMBOURSE" });
    expect(rows[3]).toMatchObject({ cashOutAmount: 15, sourceCashOutAmount: 15 });
    expect(rows[4]).toMatchObject({ initialProofAt: null, resultProofAt: null, resultEntryMethod: "MANUAL" });
  });

  it("uses the locked bankroll reference to convert EUR tickets into units", async () => {
    mocks.state.mockResolvedValue({ isPublic: false, certificationStartedAt: null, currency: "UNIT", referenceCurrency: "EUR" });
    await createOwnedBets("user-1", [input({ stake: 125 })], messages, options);
    expect(mocks.bets.mock.calls[0][0].data[0]).toMatchObject({
      stake: 12.5, stakeUnits: 12.5, sourceStakeAmount: 125, sourceStakeCurrency: "EUR", stakeCurrency: "UNIT",
    });
  });

  it("attaches accumulator legs to the right generated bet and saves new taxonomy inside the transaction", async () => {
    const source = { ...input().source, selections: [{
      sport: "Football", competition: "Ligue 1", betType: "Nouveau marché", label: "Paris", odds: 2, result: "GAGNE" as const,
    }] };
    await createOwnedBets("user-1", [input({ source }), input({ source })], messages, options);
    const rows = mocks.bets.mock.calls[0][0].data;
    const legs = mocks.selections.mock.calls[0][0].data;
    expect(legs).toMatchObject([{ betId: rows[0].id, position: 0 }, { betId: rows[1].id, position: 0 }]);
    expect(mocks.taxonomy).toHaveBeenCalledWith({
      data: [{ userId: "user-1", sport: "Football", betType: "Nouveau marché" }], skipDuplicates: true,
    });
    expect(mocks.outsideTaxonomy).not.toHaveBeenCalled();
  });

  it("validates all rows before opening the writing transaction", async () => {
    await expect(createOwnedBets("user-1", [input(), input({ stake: -1 })], messages, options)).rejects.toThrow("stake");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.bets).not.toHaveBeenCalled();
  });

  it("rejects a changed conversion reference before inserting any bet", async () => {
    mocks.periods.mockResolvedValue([{ referenceCapital: 2000, effectiveFrom: new Date("2026-01-01") }]);
    await expect(createOwnedBets("user-1", [input(), input()], messages, options)).rejects.toThrow("référence");
    expect(mocks.bets).not.toHaveBeenCalled();
    expect(mocks.committed).not.toHaveBeenCalled();
  });

  it("does not commit when writing the selections fails", async () => {
    mocks.selections.mockRejectedValueOnce(new Error("selection failure"));
    await expect(createOwnedBets("user-1", [input({ source: { ...input().source, selections: [{
      sport: "Football", competition: null, betType: null, label: "Paris", odds: 2, result: null,
    }] } })], messages, options)).rejects.toThrow("selection failure");
    expect(mocks.committed).not.toHaveBeenCalled();
  });

  it("rejects missing or foreign scan proofs", async () => {
    mocks.scans.mockResolvedValue([]);
    await expect(createOwnedBets("user-1", [input()], messages, options)).rejects.toThrow("Scan");
    expect(mocks.bets).not.toHaveBeenCalled();
  });

  it("checks allocations once per batch and rejects an allocation outside the bankroll", async () => {
    const tickets = [input({ allocationId: "allocation-1" }), input({ allocationId: "allocation-1" })];
    await createOwnedBets("user-1", tickets, messages, options);
    expect(mocks.allocations).toHaveBeenCalledTimes(1);
    expect(mocks.allocations.mock.calls[0][0].where).toEqual({
      id: { in: ["allocation-1"] }, bankrollId: "bankroll-1", bankroll: { userId: "user-1" },
    });
    mocks.allocations.mockResolvedValue([]);
    await expect(createOwnedBets("user-1", tickets, messages, options)).rejects.toThrow("owner");
  });

  it("rejects another owner's bankroll, a locked bankroll and a mixed-bankroll batch", async () => {
    mocks.owner.mockResolvedValue(null);
    await expect(createOwnedBets("other-user", [input()], messages)).rejects.toThrow("owner");
    mocks.owner.mockResolvedValue({ id: "bankroll-1" });
    mocks.locked.mockResolvedValue(true);
    await expect(createOwnedBets("user-1", [input()], messages)).rejects.toThrow("locked");
    await expect(createOwnedBets("user-1", [input(), input({ bankrollId: "other-bankroll" })], messages, options)).rejects.toThrow("owner");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("chunks large INSERT statements while keeping one transaction", async () => {
    await createOwnedBets("user-1", Array.from({ length: 201 }, () => input()), messages, options);
    expect(mocks.bets).toHaveBeenCalledTimes(2);
    expect(mocks.bets.mock.calls[0][0].data).toHaveLength(200);
    expect(mocks.bets.mock.calls[1][0].data).toHaveLength(1);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("reduces 100-ticket persistence from 500 queries to 5 with identical money and proof data", async () => {
    const tickets = Array.from({ length: 100 }, (_, i) => input({ ticketRef: `PERF-${i}` }));
    for (const ticket of tickets) await createOwnedBet("user-1", ticket, messages, options);
    const oldRows = mocks.singleBet.mock.calls.map(([args]) => args.data);
    const oldQueries = [mocks.lock, mocks.state, mocks.periods, mocks.singleScan, mocks.singleBet]
      .reduce((sum, query) => sum + query.mock.calls.length, 0);
    for (const query of [mocks.lock, mocks.state, mocks.periods, mocks.scans, mocks.bets]) query.mockClear();
    await createOwnedBets("user-1", tickets, messages, options);
    const newQueries = [mocks.lock, mocks.state, mocks.periods, mocks.scans, mocks.bets]
      .reduce((sum, query) => sum + query.mock.calls.length, 0);
    expect(oldQueries).toBe(500);
    expect(newQueries).toBe(5);
    const newRows = mocks.bets.mock.calls[0][0].data;
    expect(newRows).toHaveLength(oldRows.length);
    oldRows.forEach((expected, index) => expect(newRows[index]).toMatchObject(expected));
  });
});
