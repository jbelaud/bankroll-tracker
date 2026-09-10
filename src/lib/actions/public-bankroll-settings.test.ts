import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isLocked: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: mocks.isLocked }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankroll: { findFirst: mocks.findFirst, update: mocks.update },
    $transaction: mocks.transaction,
  },
}));

const { savePublicBankrollSettings } = await import("./public-bankroll-settings");

describe("réglages publics d’une bankroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.isLocked.mockResolvedValue(false);
    mocks.findFirst.mockResolvedValue({ id: "bankroll-a" });
    mocks.update.mockResolvedValue({ id: "bankroll-a" });
  });

  it("vérifie la propriété et normalise les données publiques", async () => {
    const form = new FormData();
    form.set("bankrollId", "bankroll-a");
    form.set("description", "  Football   pré-match  ");
    form.append("sports", " Football ");
    form.append("sports", "Football");
    form.append("sports", "Tennis");

    const result = await savePublicBankrollSettings({}, form);

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: "bankroll-a", userId: "user-a" },
      select: { id: true },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "bankroll-a" },
      data: { publicDescription: "Football pré-match", publicSports: ["Football", "Tennis"] },
    });
    expect(result).toEqual({ success: "Présentation publique enregistrée." });
  });

  it("refuse une bankroll qui n’appartient pas au compte", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const form = new FormData();
    form.set("bankrollId", "bankroll-b");

    expect(await savePublicBankrollSettings({}, form)).toEqual({ error: "Bankroll inaccessible." });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
