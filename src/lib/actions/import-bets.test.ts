import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedBet } from "@/lib/scan/types";
import { makeScanProofEvidence } from "@/lib/scan/ticket-evidence";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isLocked: vi.fn(),
  recordEvent: vi.fn(),
  revalidatePath: vi.fn(),
  bankrollFindFirst: vi.fn(),
  betFindMany: vi.fn(),
  betCount: vi.fn(),
  betUpdateMany: vi.fn(),
  betCreateMany: vi.fn(),
  scanUsageFindMany: vi.fn(),
  scanUsageUpdate: vi.fn(),
  createOwnedBet: vi.fn(),
  taxonomyCreateMany: vi.fn(),
  importBatchCreate: vi.fn(),
  tipsterCreateMany: vi.fn(),
  tipsterFindMany: vi.fn(),
  selectionCreateMany: vi.fn(),
  transaction: vi.fn(),
  taxonomyNormalize: vi.fn(),
  sportContextNormalize: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: mocks.isLocked }));
vi.mock("@/lib/growth/events", () => ({ recordGrowthEventSafely: mocks.recordEvent }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("@/lib/i18n/get-server-locale", () => ({ getServerLocale: vi.fn().mockResolvedValue("fr") }));
vi.mock("@/lib/actions/bets", () => ({ createBet: vi.fn() }));
vi.mock("@/lib/bets/create", () => ({ createOwnedBet: mocks.createOwnedBet }));
vi.mock("@/lib/taxonomy", () => ({
  getUserTaxonomy: vi.fn().mockResolvedValue({}),
  normalizeTaxonomyPair: mocks.taxonomyNormalize,
  normalizeSportContext: mocks.sportContextNormalize,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankroll: { findFirst: mocks.bankrollFindFirst },
    bet: { findMany: mocks.betFindMany, count: mocks.betCount, updateMany: mocks.betUpdateMany, createMany: mocks.betCreateMany },
    scanUsage: { findMany: mocks.scanUsageFindMany, update: mocks.scanUsageUpdate },
    userTaxonomyEntry: { createMany: mocks.taxonomyCreateMany },
    importBatch: { create: mocks.importBatchCreate },
    tipster: { createMany: mocks.tipsterCreateMany, findMany: mocks.tipsterFindMany },
    betSelection: { createMany: mocks.selectionCreateMany },
    $transaction: mocks.transaction,
  },
}));

const { importBets: importScannedBets, importExternalBets } = await import("./import-bets");
const importBets: typeof importScannedBets = (bankrollId, bets, scanUsageIds = [], scanMeasurements = [], resultForBetId, resultBatchMode = false, ticketCurrency = "EUR", ticketFxRate = null, expectedReferenceCapital) =>
  importScannedBets(bankrollId, bets, scanUsageIds, scanMeasurements, resultForBetId, resultBatchMode, ticketCurrency, ticketFxRate, expectedReferenceCapital);

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
    mocks.bankrollFindFirst.mockResolvedValue({
      id: "bankroll-1",
      mode: "DISTRIBUTED",
      currency: "EUR",
      allocations: [{ id: "allocation-1", bookmaker: "Winamax" }],
    });
    mocks.betFindMany.mockResolvedValue([]);
    mocks.betCount.mockResolvedValue(0);
    mocks.betUpdateMany.mockResolvedValue({ count: 1 });
    mocks.betCreateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    mocks.scanUsageFindMany.mockResolvedValue([]);
    mocks.scanUsageUpdate.mockResolvedValue({});
    mocks.createOwnedBet.mockResolvedValue({ id: "created-bet" });
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
    mocks.taxonomyNormalize.mockImplementation((_taxonomy, sport: string, betType: string) => ({ sport, betType, taxonomyMismatch: false }));
    mocks.sportContextNormalize.mockImplementation((_taxonomy, sport: string) => ({ sport, competition: null }));
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
      data: [expect.objectContaining({
        bankrollId: "bankroll-1",
        allocationId: "allocation-1",
        bookmaker: "Winamax",
        entryMethod: "FILE",
        ticketRef: "ticket-1",
      })],
    });
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: "bets_imported",
      properties: expect.objectContaining({ import_method: "file", file_format: "csv" }),
    }));
  });

  it("conserve les mises Bet-Analytix en unités indépendamment de la conversion privée", async () => {
    mocks.bankrollFindFirst.mockResolvedValue({ id: "bankroll-1", mode: "DISTRIBUTED", currency: "UNIT", allocations: [{ id: "allocation-1", bookmaker: "Winamax" }] });
    const sourceBet = bet({ ticketRef: null, stake: 1.25, odds: 3.75, result: "PERDU" });
    const response = await importExternalBets("bankroll-1", [sourceBet], "BET_ANALYTIX", "ba.csv");

    expect(response).toEqual({ imported: 1, skippedDuplicates: 0, firstImport: true });
    expect(mocks.importBatchCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ source: "BET_ANALYTIX_UNITS_NATIVE" }) });
    expect(mocks.betCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      stake: 1.25,
      stakeCurrency: "UNIT",
      stakeUnits: 1.25,
      unitsRecordedAt: expect.any(Date),
    })] });
  });

  it("refuse un export BA dans une bankroll en devise", async () => {
    await expect(importExternalBets("bankroll-1", [bet({ stake: 1.25 })], "BET_ANALYTIX"))
      .resolves.toEqual({ error: "Un export Bet-Analytix en U doit être importé dans une bankroll suivie en U." });
    expect(mocks.betCreateMany).not.toHaveBeenCalled();
  });

  it("conserve l'heure BA pour ordonner les paris d'un même jour", async () => {
    mocks.bankrollFindFirst.mockResolvedValue({ id: "bankroll-1", mode: "DISTRIBUTED", currency: "UNIT", allocations: [{ id: "allocation-1", bookmaker: "Winamax" }] });
    await importExternalBets("bankroll-1", [bet({
      date: "2026-09-03", placedAt: "2026-09-03T19:20:00.000Z",
    })], "BET_ANALYTIX");
    expect(mocks.betCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      date: new Date("2026-09-03T19:20:00.000Z"),
    })] });
  });

  it("reconnaît un ancien import BA comme doublon même avec une nouvelle conversion privée", async () => {
    mocks.bankrollFindFirst.mockResolvedValue({ id: "bankroll-1", mode: "DISTRIBUTED", currency: "UNIT", allocations: [{ id: "allocation-1", bookmaker: "Winamax" }] });
    mocks.betFindMany.mockResolvedValue([{
      ticketRef: null,
      date: new Date("2026-08-20T12:00:00.000Z"),
      stake: 1.25,
      stakeUnits: 2.5,
      odds: 3.75,
      description: "Paris gagne",
      importBatch: { source: "BET_ANALYTIX" },
    }]);

    const response = await importExternalBets("bankroll-1", [bet({ ticketRef: null, stake: 1.25, odds: 3.75 })], "BET_ANALYTIX", "ba.csv");
    expect(response).toEqual({ imported: 0, skippedDuplicates: 1, firstImport: false });
    expect(mocks.betCreateMany).not.toHaveBeenCalled();
  });

  it("exige et valide le bookmaker de destination pour une bankroll répartie", async () => {
    mocks.bankrollFindFirst.mockResolvedValue({
      id: "bankroll-1",
      mode: "DISTRIBUTED",
      allocations: [
        { id: "allocation-a", bookmaker: "Winamax" },
        { id: "allocation-b", bookmaker: "Betclic" },
      ],
    });

    await expect(importExternalBets("bankroll-1", [bet()], "CSV"))
      .resolves.toEqual({ error: "Choisis le bookmaker dans lequel importer ces paris." });
    await expect(importExternalBets("bankroll-1", [bet()], "CSV", undefined, "allocation-other"))
      .resolves.toEqual({ error: "Le bookmaker choisi n’appartient pas à cette bankroll." });

    const response = await importExternalBets("bankroll-1", [bet()], "CSV", undefined, "allocation-b");
    expect(response).toEqual({ imported: 1, skippedDuplicates: 0, firstImport: true });
    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ allocationId: "allocation-b", bookmaker: "Betclic" })],
    });
  });

  it("conserve un marché inattendu sans le classer dans Autre", async () => {
    mocks.taxonomyNormalize.mockReturnValue({ sport: "Basketball", betType: "Buteur", taxonomyMismatch: true });

    const response = await importExternalBets("bankroll-1", [bet({ sport: "Basketball", betType: "Buteur" })], "CSV");

    expect(response).toEqual({ imported: 1, skippedDuplicates: 0, firstImport: true });
    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sport: "Basketball", betType: "Buteur" })],
    });
  });

  it("enregistre NBA comme compétition du basket", async () => {
    mocks.sportContextNormalize.mockImplementation((_taxonomy, sport: string) => sport === "NBA"
      ? { sport: "Basketball", competition: "NBA" }
      : { sport, competition: null });

    await importExternalBets("bankroll-1", [bet({ sport: "NBA", betType: "Vainqueur" })], "CSV");

    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sport: "Basketball", betType: "Vainqueur" })],
    });
    expect(mocks.selectionCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sport: "Basketball", competition: "NBA", betType: "Vainqueur" })],
    });
  });

  it("ajoute chaque sport détecté dans la taxonomie personnelle", async () => {
    await importExternalBets("bankroll-1", [bet({
      sport: "Multi-sport",
      betType: "Combiné",
      selections: [{
        sport: "Pickleball",
        competition: "PPA Tour",
        betType: "Vainqueur du match",
        label: "Joueur A",
        odds: 1.8,
        result: "GAGNE",
      }],
    })], "CSV");

    expect(mocks.taxonomyCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ sport: "Pickleball", betType: "Vainqueur du match" }),
      ]),
      skipDuplicates: true,
    });
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

  it("laisse un pari sans Tipster en Personnel", async () => {
    await importExternalBets("bankroll-1", [bet({ tipster: null })], "CSV");

    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ tipsterId: null })],
    });
  });

  it("matche un Tipster détecté existant sans en créer un nouveau", async () => {
    mocks.tipsterFindMany.mockResolvedValue([{ id: "tipster-1", normalizedName: "el professor" }]);

    await importExternalBets("bankroll-1", [bet({ tipster: " EL  PROFESSOR " })], "CSV");

    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ tipsterId: "tipster-1" })],
    });
    expect(mocks.tipsterCreateMany).not.toHaveBeenCalled();
  });

  it("ne crée pas automatiquement un Tipster détecté inconnu", async () => {
    mocks.tipsterFindMany.mockResolvedValue([]);

    await importExternalBets("bankroll-1", [bet({ tipster: "Betting God" })], "CSV");

    expect(mocks.betCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ tipsterId: null })],
    });
    expect(mocks.tipsterCreateMany).not.toHaveBeenCalled();
  });

  it("associe le Tipster créé depuis la revue et refuse un ID étranger", async () => {
    mocks.tipsterFindMany.mockResolvedValueOnce([{ id: "tipster-1", normalizedName: "betting god" }]);
    await importExternalBets("bankroll-1", [bet({ tipster: "Betting God", tipsterId: "tipster-1" })], "CSV");
    expect(mocks.betCreateMany).toHaveBeenLastCalledWith({
      data: [expect.objectContaining({ tipsterId: "tipster-1" })],
    });

    mocks.tipsterFindMany.mockResolvedValueOnce([]);
    await expect(importExternalBets("bankroll-1", [bet({ tipsterId: "tipster-other" })], "CSV"))
      .resolves.toEqual({ error: "Tipster introuvable." });
  });
});

describe("importBets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.isLocked.mockResolvedValue(false);
    mocks.bankrollFindFirst.mockResolvedValue({
      id: "bankroll-1",
      mode: "SINGLE",
      currency: "EUR",
      referenceCurrency: "EUR",
      referenceCapital: 100,
      allocations: [],
    });
    mocks.betCount.mockResolvedValue(1);
    mocks.betUpdateMany.mockResolvedValue({ count: 1 });
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result",
      detectedBookmaker: "Winamax",
      createdAt: new Date("2026-09-15T23:26:48.475Z"),
      proofEvidence: [makeScanProofEvidence("6IZ7T10Y", "Simple @ 2,55 • Perdu", null)],
    }]);
    mocks.scanUsageUpdate.mockResolvedValue({});
    mocks.tipsterFindMany.mockResolvedValue([]);
    mocks.recordEvent.mockResolvedValue(undefined);
    mocks.taxonomyNormalize.mockImplementation((_taxonomy, sport: string, betType: string) => ({ sport, betType, taxonomyMismatch: false }));
    mocks.sportContextNormalize.mockImplementation((_taxonomy, sport: string) => ({ sport, competition: null }));
  });

  it("met à jour le pari en attente correspondant au lieu de créer un doublon", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "pending-bet",
      ticketRef: "6IZ7T10Y",
      date: new Date("2026-09-15T00:00:00.000Z"),
      stake: 5,
      odds: 2.55,
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: "6IZ7T10Y",
      date: "2026-09-15",
      stake: 5,
      odds: 2.55,
      result: "PERDU",
      eventResult: "West Ham 2 - 3 Fulham",
      sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toEqual({
      imported: 1,
      firstImport: false,
      resultProofsUpdated: 1,
      resultProofsVerified: 1,
    });
    expect(mocks.betUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "pending-bet",
        result: "EN_ATTENTE",
        bankroll: { userId: "user-1" },
      },
      data: expect.objectContaining({
        result: "PERDU",
        eventResult: "West Ham 2 - 3 Fulham",
        resultEntryMethod: "SCAN",
      }),
    });
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("met à jour un pari Bet365 sans référence avec sélection, cote et mise identiques", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "pending-bet365",
      ticketRef: null,
      date: new Date("2026-10-04T00:00:00.000Z"),
      stake: 62.57,
      odds: 2.69,
      bookmaker: "Bet365",
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta — Marque à tout moment — Cucuta Deportivo - Deportivo Pereira",
      format: "SIMPLE",
    }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result",
      detectedBookmaker: "Bet365",
      selectedBookmaker: "Bet365",
      createdAt: new Date("2026-10-05T00:00:00.000Z"),
      proofEvidence: null,
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: null,
      date: null,
      stake: 62.57,
      odds: 2.69,
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta - Marque à tout moment - Cucuta Deportivo / Deportivo Pereira",
      result: "GAGNE",
      eventResult: "Cucuta Deportivo 4 - 0 Deportivo Pereira",
      format: "SIMPLE",
      sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toMatchObject({ imported: 1, resultProofsUpdated: 1 });
    expect(mocks.betUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "pending-bet365", result: "EN_ATTENTE" }),
      data: expect.objectContaining({ result: "GAGNE", resultEntryMethod: "SCAN" }),
    }));
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("met à jour un ticket recadré sans bookmaker lorsque l'identité exacte est unique", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "pending-cropped",
      ticketRef: null,
      date: new Date("2026-10-04T00:00:00.000Z"),
      stake: 62.57,
      odds: 2.69,
      bookmaker: null,
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta — Cucuta Deportivo - Deportivo Pereira",
      format: "SIMPLE",
      selections: [{ sport: "Football", betType: "Buteur", label: "Jaime Peralta", odds: 2.69 }],
    }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result",
      detectedBookmaker: null,
      selectedBookmaker: null,
      createdAt: new Date("2026-10-05T11:53:37.370Z"),
      proofEvidence: [],
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: null,
      date: "2026-10-04",
      stake: 62.57,
      odds: 2.69,
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta — Marque à tout moment",
      result: "GAGNE",
      eventResult: "Cucuta Deportivo 4 - 0 Deportivo Pereira",
      format: "SIMPLE",
      selections: [{
        sport: "Football", competition: null, betType: "Buteur",
        label: "Jaime Peralta", odds: 2.69, result: "GAGNE",
      }],
      sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toMatchObject({ imported: 1, resultProofsUpdated: 1 });
    expect(mocks.betUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "pending-cropped", result: "EN_ATTENTE" }),
      data: expect.objectContaining({
        result: "GAGNE",
        resultProofAt: new Date("2026-10-05T11:53:37.370Z"),
        resultEntryMethod: "SCAN",
      }),
    }));
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("rapproche un résultat Bet365 REMPLAÇANT+ du pari initial", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "pending-bet365-replacement",
      ticketRef: null,
      date: new Date("2026-10-04T00:00:00.000Z"),
      stake: 20.07,
      odds: 12,
      bookmaker: "Bet365",
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta — Marque deux buts ou plus — Cucuta Deportivo - Deportivo Pereira",
      format: "SIMPLE",
    }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result",
      detectedBookmaker: "Bet365",
      selectedBookmaker: "Bet365",
      createdAt: new Date("2026-10-05T00:00:00.000Z"),
      proofEvidence: null,
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: null,
      date: null,
      stake: 20.07,
      odds: 12,
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta → Jhonathan Agudelo (REMPLAÇANT+) — Marque deux buts ou plus — Cucuta Deportivo - Deportivo Pereira",
      result: "PERDU",
      eventResult: "Cucuta Deportivo 4 - 0 Deportivo Pereira",
      format: "SIMPLE",
      sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toMatchObject({ imported: 1, resultProofsUpdated: 1 });
    expect(mocks.betUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "pending-bet365-replacement", result: "EN_ATTENTE" }),
      data: expect.objectContaining({ result: "PERDU", resultEntryMethod: "SCAN" }),
    }));
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("ne crée pas un nouveau pari à partir d'une carte Bet365 réglée sans date", async () => {
    mocks.betFindMany.mockResolvedValue([]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result", detectedBookmaker: "Bet365", selectedBookmaker: "Bet365",
      createdAt: new Date("2026-10-05T00:00:00.000Z"), proofEvidence: null,
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: null, date: null, stake: 50.07, odds: 3.5, sport: "Football", betType: "Buteur",
      description: "Diego Dorregaray Marque à tout moment Guayaquil City Leones FC",
      result: "GAGNE", format: "SIMPLE", sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toEqual({ error: expect.stringContaining("date doit être renseignée") });
    expect(mocks.betUpdateMany).not.toHaveBeenCalled();
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("ne fusionne pas deux paris Bet365 sans référence lorsque le rapprochement est ambigu", async () => {
    const target = {
      ticketRef: null,
      date: new Date("2026-10-04T00:00:00.000Z"),
      stake: 62.57,
      odds: 2.69,
      bookmaker: "Bet365",
      sport: "Football",
      betType: "Buteur",
      description: "Jaime Peralta Marque à tout moment Cucuta Deportivo Deportivo Pereira",
      format: "SIMPLE",
    };
    mocks.betFindMany.mockResolvedValue([{ ...target, id: "pending-1" }, { ...target, id: "pending-2" }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result", detectedBookmaker: "Bet365", selectedBookmaker: "Bet365",
      createdAt: new Date("2026-10-05T00:00:00.000Z"), proofEvidence: null,
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: null, date: null, stake: 62.57, odds: 2.69, sport: "Football", betType: "Buteur",
      description: target.description, result: "GAGNE", format: "SIMPLE", sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toEqual({ error: expect.stringContaining("Plusieurs paris en attente") });
    expect(mocks.betUpdateMany).not.toHaveBeenCalled();
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("refuse de créer un second pari en attente avec la même référence PMU", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "pending-pmu",
      ticketRef: "1311559614",
      date: new Date("2026-09-17T00:00:00.000Z"),
      stake: 5,
      odds: 2.63,
    }]);
    const response = await importBets("bankroll-1", [bet({
      ticketRef: "1311559614",
      date: "2026-09-14",
      stake: 5,
      odds: 2.63,
      result: "EN_ATTENTE",
      sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toEqual({ error: expect.stringContaining("déjà enregistré en cours") });
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("met à jour le même ticket PMU gagné, sans doublon ni nouvelle preuve initiale", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "existing-pmu", ticketRef: "REF-000001",
      date: new Date("2026-09-14T00:00:00Z"), stake: 1, odds: 2.63,
    }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result", detectedBookmaker: null, selectedBookmaker: "PMU",
      createdAt: new Date("2026-09-17T20:58:00Z"),
      proofEvidence: [makeScanProofEvidence("REF-000001", "Simple @ 2,63 • Gagné", "17 sept. 2026, 21:00")],
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: "REF-000001", date: "2026-09-14", stake: 1, odds: 2.63,
      result: "GAGNE", sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toMatchObject({ imported: 1, resultProofsUpdated: 1 });
    expect(mocks.betUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ result: "GAGNE", resultProofAt: new Date("2026-09-17T20:58:00Z"), resultEntryMethod: "SCAN" }),
    }));
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("refuses an automatic PMU result update without the ticket header evidence", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "existing-pmu", ticketRef: "REF-000001",
      date: new Date("2026-09-14T00:00:00Z"), stake: 1, odds: 2.63,
    }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result", detectedBookmaker: null, selectedBookmaker: "PMU",
      createdAt: new Date("2026-09-17T20:58:00Z"),
      proofEvidence: [makeScanProofEvidence("REF-000001", null, null)],
    }]);

    const response = await importBets("bankroll-1", [bet({ ticketRef: "REF-000001", date: "2026-09-14", stake: 1, odds: 2.63, result: "GAGNE", sourceScanIndex: 0 })], ["scan-result"]);

    expect(response).toEqual({ error: expect.stringContaining("déjà enregistré") });
    expect(mocks.betUpdateMany).not.toHaveBeenCalled();
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("refuses a result update without header proof when the bookmaker is unidentified", async () => {
    mocks.betFindMany.mockResolvedValue([{
      id: "existing-pmu", ticketRef: "13115596142",
      date: new Date("2026-09-14T00:00:00Z"), stake: 5, odds: 2.63,
    }]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result", detectedBookmaker: null, selectedBookmaker: null,
      createdAt: new Date("2026-09-17T20:58:00Z"), proofEvidence: null,
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: "13115596142", date: "2026-09-14", stake: 5, odds: 2.63,
      result: "GAGNE", sourceScanIndex: 0,
    })], ["scan-result"]);

    expect(response).toEqual({ error: expect.stringContaining("déjà enregistré") });
    expect(mocks.betUpdateMany).not.toHaveBeenCalled();
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("preserves the source scan index after a skipped earlier file", async () => {
    mocks.betFindMany.mockResolvedValue([]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-second", detectedBookmaker: null, selectedBookmaker: "PMU",
      createdAt: new Date("2026-09-17T18:26:00Z"),
      proofEvidence: [makeScanProofEvidence("REF-000002", "Simple @ 2,63 • En cours", "17 sept. 2026, 21:00")],
    }]);
    mocks.createOwnedBet.mockResolvedValue({ id: "new-pmu" });

    const response = await importBets("bankroll-1", [bet({
      ticketRef: "REF-000002", date: "2026-09-14", stake: 1, odds: 2.63,
      result: "EN_ATTENTE", sourceScanIndex: 1,
    })], ["", "scan-second"]);

    expect(response).toMatchObject({ imported: 1, resultProofsUpdated: 0 });
    expect(mocks.createOwnedBet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      source: expect.objectContaining({ scanUsageId: "scan-second", eventStartAt: new Date("2026-09-17T19:00:00Z") }),
    }), expect.anything(), expect.anything());
  });

  it("qualifies a pending ticket from its visible placement time when no event time is shown", async () => {
    mocks.betFindMany.mockResolvedValue([]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-winamax", detectedBookmaker: "Winamax", selectedBookmaker: "Winamax",
      createdAt: new Date("2026-10-05T19:18:55Z"),
      proofEvidence: [makeScanProofEvidence(
        "6JRT3KC2", null, null, "20h36 - 5 octobre 2026", "EN_ATTENTE"
      )],
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: "6JRT3KC2", date: "2026-10-05", stake: 10, odds: 2,
      result: "EN_ATTENTE", sourceScanIndex: 0,
    })], ["scan-winamax"]);

    expect(response).toMatchObject({ imported: 1, resultProofsUpdated: 0 });
    expect(mocks.createOwnedBet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      source: expect.objectContaining({
        scanUsageId: "scan-winamax",
        eventStartAt: null,
        ticketPlacedAt: new Date("2026-10-05T18:36:00Z"),
      }),
    }), expect.anything(), expect.anything());
  });

  it("rejects an ambiguous existing reference before creating a duplicate", async () => {
    mocks.betFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{
      id: "settled-pmu", ticketRef: "REF-000001",
      date: new Date("2026-09-14T00:00:00Z"), stake: 1, odds: 2.63,
    }]);
    const response = await importBets("bankroll-1", [bet({ ticketRef: "REF-000001", date: "2026-09-14", stake: 1, odds: 2.63, result: "GAGNE", sourceScanIndex: 0 })], ["scan-result"]);
    expect(response).toEqual({ error: expect.stringContaining("déjà enregistré") });
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("met à jour plusieurs résultats certifiés en lot sans créer de pari", async () => {
    mocks.betFindMany.mockResolvedValue([
      {
        id: "pending-1", ticketRef: "REF-000001",
        date: new Date("2026-10-05T00:00:00Z"), stake: 5, odds: 2,
      },
      {
        id: "pending-2", ticketRef: "REF-000002",
        date: new Date("2026-10-05T00:00:00Z"), stake: 10, odds: 1.8,
      },
    ]);
    mocks.scanUsageFindMany.mockResolvedValue([
      {
        id: "scan-result-1", detectedBookmaker: "Winamax", selectedBookmaker: "Winamax",
        createdAt: new Date("2026-10-05T20:00:00Z"),
        proofEvidence: [makeScanProofEvidence("REF-000001", "Simple @ 2,00 • Gagné", null)],
      },
      {
        id: "scan-result-2", detectedBookmaker: "Winamax", selectedBookmaker: "Winamax",
        createdAt: new Date("2026-10-05T20:01:00Z"),
        proofEvidence: [makeScanProofEvidence("REF-000002", "Simple @ 1,80 • Perdu", null)],
      },
    ]);

    const response = await importBets("bankroll-1", [
      bet({ ticketRef: "REF-000001", date: "2026-10-05", stake: 5, odds: 2, result: "GAGNE", sourceScanIndex: 0 }),
      bet({ ticketRef: "REF-000002", date: "2026-10-05", stake: 10, odds: 1.8, result: "PERDU", sourceScanIndex: 1 }),
    ], ["scan-result-1", "scan-result-2"], [], undefined, true);

    expect(response).toEqual({ imported: 2, firstImport: false, resultProofsUpdated: 2, resultProofsVerified: 2 });
    expect(mocks.betUpdateMany).toHaveBeenCalledTimes(2);
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });

  it("refuse tout le lot lorsqu'un résultat ne correspond à aucun pari en attente", async () => {
    mocks.betFindMany.mockResolvedValue([]);
    mocks.scanUsageFindMany.mockResolvedValue([{
      id: "scan-result", detectedBookmaker: "Winamax", selectedBookmaker: "Winamax",
      createdAt: new Date("2026-10-05T20:00:00Z"),
      proofEvidence: [makeScanProofEvidence("REF-UNKNOWN", "Simple @ 2,00 • Gagné", null)],
    }]);

    const response = await importBets("bankroll-1", [bet({
      ticketRef: "REF-UNKNOWN", date: "2026-10-05", stake: 5, odds: 2,
      result: "GAGNE", sourceScanIndex: 0,
    })], ["scan-result"], [], undefined, true);

    expect(response).toEqual({ error: expect.stringContaining("ne correspond pas de façon unique") });
    expect(mocks.betUpdateMany).not.toHaveBeenCalled();
    expect(mocks.createOwnedBet).not.toHaveBeenCalled();
  });
});
