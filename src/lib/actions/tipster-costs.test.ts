import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  tipsterFindFirst: vi.fn(),
  costFindFirst: vi.fn(),
  costCreate: vi.fn(),
  costUpdate: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tipster: { findFirst: mocks.tipsterFindFirst },
    tipsterCostPeriod: {
      findFirst: mocks.costFindFirst,
      update: mocks.costUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

const { endTipsterCostPeriod, setTipsterCostPeriod } = await import("./tipster-costs");

describe("actions coûts VIP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.tipsterFindFirst.mockResolvedValue({ id: "tipster-a", user: { currency: "EUR" } });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      tipsterCostPeriod: {
        findFirst: mocks.costFindFirst,
        create: mocks.costCreate,
        update: mocks.costUpdate,
      },
    }));
  });

  it("refuse de créer un coût pour le Tipster d'un autre utilisateur", async () => {
    mocks.tipsterFindFirst.mockResolvedValue(null);

    await expect(setTipsterCostPeriod("tipster-b", {
      kind: "PAID",
      amount: 30,
      frequency: "MONTHLY",
      startDate: "2026-08-12",
    })).resolves.toEqual({ success: false, error: "TIPSTER_NOT_FOUND" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("crée une période gratuite explicite dans la devise de l'utilisateur", async () => {
    mocks.costFindFirst.mockResolvedValue(null);

    await expect(setTipsterCostPeriod("tipster-a", {
      kind: "FREE",
      startDate: "2026-08-12",
    })).resolves.toEqual({ success: true });

    expect(mocks.costCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      tipsterId: "tipster-a",
      kind: "FREE",
      amount: null,
      frequency: null,
      currency: "EUR",
    }) });
  });

  it("ferme l'ancien tarif la veille avant de créer le nouveau", async () => {
    mocks.costFindFirst.mockResolvedValue({
      id: "old-period",
      startDate: new Date("2026-08-12"),
      endDate: null,
    });

    await expect(setTipsterCostPeriod("tipster-a", {
      kind: "PAID",
      amount: 30,
      frequency: "MONTHLY",
      startDate: "2026-10-01",
    })).resolves.toEqual({ success: true });

    expect(mocks.costUpdate).toHaveBeenCalledWith({
      where: { id: "old-period" },
      data: { endDate: new Date("2026-09-30T00:00:00.000Z") },
    });
    expect(mocks.costCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 30 }) });
  });

  it("rejette un nouveau tarif antérieur à la dernière période", async () => {
    mocks.costFindFirst.mockResolvedValue({
      id: "current-period",
      startDate: new Date("2026-10-01"),
      endDate: null,
    });

    await expect(setTipsterCostPeriod("tipster-a", {
      kind: "PAID",
      amount: 20,
      frequency: "MONTHLY",
      startDate: "2026-09-01",
    })).resolves.toEqual({ success: false, error: "START_BEFORE_CURRENT" });
    expect(mocks.costCreate).not.toHaveBeenCalled();
  });

  it("filtre aussi la fin de période par le propriétaire authentifié", async () => {
    mocks.costFindFirst.mockResolvedValue(null);
    mocks.tipsterFindFirst.mockResolvedValue(null);

    await expect(endTipsterCostPeriod("tipster-b", "2026-11-05"))
      .resolves.toEqual({ success: false, error: "TIPSTER_NOT_FOUND" });
    expect(mocks.costFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tipster: { id: "tipster-b", userId: "user-a" } },
    }));
    expect(mocks.costUpdate).not.toHaveBeenCalled();
  });
});

