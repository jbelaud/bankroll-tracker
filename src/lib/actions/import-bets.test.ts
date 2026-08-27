import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedBet } from "@/lib/scan/types";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isLocked: vi.fn(),
  recordEvent: vi.fn(),
  revalidatePath: vi.fn(),
  bankrollFindFirst: vi.fn(),
  betFindMany: vi.fn(),
  betCount: vi.fn(),
  betCreateMany: vi.fn(),
  taxonomyCreateMany: vi.fn(),
  importBatchCreate: vi.fn(),
  tipsterCreateMany: vi.fn(),
  tipsterFindMany: vi.fn(),
  selectionCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: mocks.isLocked }));
vi.mock("@/lib/growth/events", () => ({ recordGrowthEventSafely: mocks.recordEvent }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("@/lib/i18n/get-server-locale", () => ({ getServerLocale: vi.fn() }));
vi.mock("@/lib/actions/bets", () => ({ createBet: vi.fn() }));
vi.mock("@/lib/taxonomy", () => ({
  getUserTaxonomy: vi.fn().mockResolvedValue({}),
  normalizeTaxonomyPair: vi.fn((_taxonomy, sport: string, betType: string) => ({ sport, betType, taxonomyMismatch: false })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankroll: { findFirst: mocks.bankrollFindFirst },
    bet: { findMany: mocks.betFindMany, count: mocks.betCount, createMany: mocks.betCreateMany },
    userTaxonomyEntry: { createMany: mocks.taxonomyCreateMany },
    importBatch: { create: mocks.importBatchCreate },
    tipster: { createMany: mocks.tipsterCreateMany, findMany: mocks.tipsterFindMany },
    betSelection: { createMany: mocks.selectionCreateMany },
    $transaction: mocks.transaction,
  },
}));

const { importExternalBets } = await import("./import-bets");

function bet(overrides: Partial<ParsedBet> = {}): ParsedBet {
  return {
    ticketRef: "ticket-1",
    date: "2026-08-20",
    sport: "Football",
    betType: "Résultat du match",
    description: "Paris gagne",
    eventResult: null,
    stake: 10,
    odds: 2,
    boosted: false,
    originalOdds: null,
    freebet: false,
    live: false,
    result: "GAGNE",
    cashOutAmount: null,
    ...overrides,
  };
}

describe("importExternalBets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.isLocked.mockResolvedValue(false);
    mocks.bankrollFindFirst.mockResolvedValue({ id: "bankroll-1" });
    mocks.betFindMany.mockResolvedValue([]);
    mocks.betCount.mockResolvedValue(0);
    mocks.betCreateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    mocks.taxonomyCreateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    mocks.importBatchCreate.mockResolvedValue({ id: "batch-1" });
    mocks.tipsterCreateMany.mockResolvedValue({ count: 0 });
    mocks.tipsterFindMany.mockResolvedValue([]);
    mocks.selectionCreateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      bet: { createMany: mocks.betCreateMany },
      userTaxonomyEntry: { createMany: mocks.taxonomyCreateMany },
      importBatch: { create: mocks.importBatchCreate },
      tipster: { createMany: mocks.tipsterCreateMany, findMany: mocks.tipsterFindMany },
      betSelection: { createMany: mocks.selectionCreateMany },
    }));
    mocks.recordEvent.mockResolvedValue(undefined);
  });

  it("refuse une bankroll qui n'appartient pas à l'utilisateur", async () => {
    mocks.bankrollFindFirst.mockResolvedValue(null);

    await expect(importExternalBets("bankroll-other", [bet()], "CSV")).resolves.toEqual({
      error: "Bankroll introuvable.",
    });
    expect(mocks.betCreateMany).not.toHaveBeenCalled();
  });

  it("importe en lot et marque la provenance fichier", async () => {
    const response = await importExternalBets("bankroll-1", [bet()], "CSV");

    expect(response).toEqual({ imported: 1, skippedDuplicates: 0, firstImport: true });
    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ bankrollId: "bankroll-1", entryMethod: "FILE", ticketRef: "ticket-1" })],
    });
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: "bets_imported",
      properties: expect.objectContaining({ import_method: "file", file_format: "csv" }),
    }));
  });

  it("ignore les doublons déjà présents et ceux répétés dans le fichier", async () => {
    mocks.betFindMany.mockResolvedValue([{
      ticketRef: "ticket-1",
      date: new Date("2026-08-20T12:00:00.000Z"),
      stake: 10,
      odds: 2,
      description: "Paris gagne",
    }]);

    const response = await importExternalBets("bankroll-1", [
      bet(),
      bet({ ticketRef: null, description: "Nouveau pari" }),
      bet({ ticketRef: null, description: "Nouveau pari" }),
    ], "JSON");

    expect(response).toEqual({ imported: 1, skippedDuplicates: 2, firstImport: true });
    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ ticketRef: null, description: "Nouveau pari" })],
    });
  });
});
