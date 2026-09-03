import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  bankrollFindFirst: vi.fn(),
  betFindFirst: vi.fn(),
  betCreate: vi.fn(),
  betUpdate: vi.fn(),
  betFindMany: vi.fn(),
  betUpdateMany: vi.fn(),
  selectionCreateMany: vi.fn(),
  tipsterFindFirst: vi.fn(),
  tipsterFindUnique: vi.fn(),
  isLocked: vi.fn(),
  saveTaxonomy: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: mocks.isLocked }));
vi.mock("@/lib/i18n/get-server-locale", () => ({ getServerLocale: vi.fn().mockResolvedValue("fr") }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/taxonomy", () => ({
  getUserTaxonomy: vi.fn().mockResolvedValue({ Football: ["Résultat du match"] }),
  normalizeTaxonomyPair: vi.fn((_taxonomy, sport: string, betType: string) => ({ sport, betType, taxonomyMismatch: false })),
  saveUserTaxonomyEntry: mocks.saveTaxonomy,
  saveUserTaxonomyEntries: mocks.saveTaxonomy,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankroll: { findFirst: mocks.bankrollFindFirst },
    bet: {
      findFirst: mocks.betFindFirst,
      findMany: mocks.betFindMany,
      create: mocks.betCreate,
      update: mocks.betUpdate,
      updateMany: mocks.betUpdateMany,
    },
    betSelection: { createMany: mocks.selectionCreateMany },
    tipster: { findFirst: mocks.tipsterFindFirst, findUnique: mocks.tipsterFindUnique },
  },
}));

const { createBet, moveBets, updateBet } = await import("@/lib/actions/bets");

const updateInput = {
  sport: "Football",
  betType: "Résultat du match",
  description: "Paris gagne",
  eventResult: "",
  date: "2026-08-27",
  stake: 10,
  odds: 2,
  result: "EN_ATTENTE" as const,
  cashOutAmount: null,
  boosted: false,
  originalOdds: null,
  freebet: false,
  live: false,
  tipsterId: null as string | null,
};

describe("association Bet / Tipster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.bankrollFindFirst.mockResolvedValue({ id: "bankroll-a", userId: "user-a" });
    mocks.betFindFirst.mockResolvedValue({ id: "bet-a", bankrollId: "bankroll-a", tipsterId: null });
    mocks.betCreate.mockImplementation(async ({ data }) => ({ id: "bet-a", ...data }));
    mocks.betUpdate.mockImplementation(async ({ data }) => ({ id: "bet-a", bankrollId: "bankroll-a", ...data, tipster: null, selections: [] }));
    mocks.isLocked.mockResolvedValue(false);
    mocks.saveTaxonomy.mockResolvedValue(undefined);
  });

  it("crée un pari Personnel sans Tipster", async () => {
    await createBet(
      "bankroll-a", "Football", "Résultat du match", "Paris gagne", 10, 2,
      false, null, false, false, "EN_ATTENTE", null, null, new Date("2026-08-27")
    );

    expect(mocks.betCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipsterId: null }),
    }));
  });

  it("associe uniquement un Tipster actif possédé", async () => {
    mocks.tipsterFindFirst.mockResolvedValue({ id: "tipster-a" });

    await createBet(
      "bankroll-a", "Football", "Résultat du match", "Paris gagne", 10, 2,
      false, null, false, false, "EN_ATTENTE", null, null, new Date("2026-08-27"), null,
      { tipsterId: "tipster-a" }
    );

    expect(mocks.tipsterFindFirst).toHaveBeenCalledWith({
      where: { id: "tipster-a", userId: "user-a", status: "ACTIVE" },
      select: { id: true },
    });
    expect(mocks.betCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipsterId: "tipster-a" }),
    }));
  });

  it("refuse le Tipster d'un autre utilisateur", async () => {
    mocks.tipsterFindFirst.mockResolvedValue(null);

    await expect(createBet(
      "bankroll-a", "Football", "Résultat du match", "Paris gagne", 10, 2,
      false, null, false, false, "EN_ATTENTE", null, null, new Date("2026-08-27"), null,
      { tipsterId: "tipster-b" }
    )).rejects.toThrow("Tipster introuvable.");
    expect(mocks.betCreate).not.toHaveBeenCalled();
  });

  it("permet de changer puis retirer le Tipster d'un pari possédé", async () => {
    mocks.tipsterFindFirst.mockResolvedValue({ id: "tipster-a" });

    await updateBet("bet-a", { ...updateInput, tipsterId: "tipster-a" });
    expect(mocks.betUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipsterId: "tipster-a" }),
    }));

    await updateBet("bet-a", { ...updateInput, tipsterId: null });
    expect(mocks.betUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipsterId: null }),
    }));
  });

  it("conserve le Tipster archivé déjà lié sans permettre d'en choisir un autre", async () => {
    mocks.betFindFirst.mockResolvedValue({ id: "bet-a", bankrollId: "bankroll-a", tipsterId: "tipster-archived" });
    mocks.tipsterFindFirst.mockResolvedValue({ id: "tipster-archived" });

    await updateBet("bet-a", { ...updateInput, tipsterId: "tipster-archived" });
    expect(mocks.tipsterFindFirst).toHaveBeenLastCalledWith({
      where: { id: "tipster-archived", userId: "user-a" },
      select: { id: true },
    });

    mocks.tipsterFindFirst.mockResolvedValue(null);
    await expect(updateBet("bet-a", { ...updateInput, tipsterId: "another-archived" }))
      .rejects.toThrow("Tipster introuvable.");
    expect(mocks.tipsterFindFirst).toHaveBeenLastCalledWith({
      where: { id: "another-archived", userId: "user-a", status: "ACTIVE" },
      select: { id: true },
    });
  });
});

describe("déplacement de paris entre bankrolls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.isLocked.mockResolvedValue(false);
    mocks.betFindMany.mockResolvedValue([{ id: "bet-a", bankrollId: "bankroll-source" }]);
    mocks.betUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("remplace l’ancienne allocation par celle d’une destination mono-bookmaker", async () => {
    mocks.bankrollFindFirst.mockResolvedValue({
      id: "bankroll-target",
      userId: "user-a",
      mode: "DISTRIBUTED",
      allocations: [{ id: "allocation-target", bookmaker: "Betclic" }],
    });

    await expect(moveBets(["bet-a"], "bankroll-target")).resolves.toEqual({ moved: 1 });
    expect(mocks.betUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        bankrollId: "bankroll-target",
        allocationId: "allocation-target",
        bookmaker: "Betclic",
      },
    }));
  });

  it("efface une allocation étrangère si la destination exige un choix ultérieur", async () => {
    mocks.bankrollFindFirst.mockResolvedValue({
      id: "bankroll-target",
      userId: "user-a",
      mode: "DISTRIBUTED",
      allocations: [
        { id: "allocation-a", bookmaker: "Winamax" },
        { id: "allocation-b", bookmaker: "Betclic" },
      ],
    });

    await moveBets(["bet-a"], "bankroll-target");
    expect(mocks.betUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        bankrollId: "bankroll-target",
        allocationId: null,
        bookmaker: null,
      },
    }));
  });
});
