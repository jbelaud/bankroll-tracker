import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  recordEvent: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/growth/events", () => ({ recordGrowthEventSafely: mocks.recordEvent }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tipster: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
  },
}));

const { archiveTipster, createTipster, listTipsters, updateTipster } = await import("@/lib/actions/tipsters");

const tipster = {
  id: "tipster-a",
  userId: "user-a",
  name: "El Professor",
  normalizedName: "el professor",
  platform: "DISCORD" as const,
  notes: null,
  status: "ACTIVE" as const,
  archivedAt: null,
  createdAt: new Date("2026-08-27T10:00:00.000Z"),
  updatedAt: new Date("2026-08-27T10:00:00.000Z"),
  _count: { bets: 2 },
};

describe("actions Tipsters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.recordEvent.mockResolvedValue(undefined);
  });

  it("liste uniquement les Tipsters actifs de l'utilisateur authentifié", async () => {
    mocks.findMany.mockResolvedValue([tipster]);

    await expect(listTipsters()).resolves.toEqual([
      expect.objectContaining({ id: "tipster-a", betCount: 2 }),
    ]);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-a", status: "ACTIVE" },
    }));
  });

  it("crée un Tipster normalisé pour l'utilisateur authentifié", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue(tipster);

    const result = await createTipster({ name: "  El   Professor ", platform: "DISCORD" });

    expect(result).toEqual({ success: true, tipster: expect.objectContaining({ id: "tipster-a" }), existing: false });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-a", name: "El Professor", normalizedName: "el professor" }),
    }));
  });

  it("refuse un nom vide", async () => {
    await expect(createTipster({ name: "   " })).resolves.toEqual({
      success: false,
      error: "Le nom du tipster est requis.",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("retourne l'existant au lieu de créer un doublon normalisé", async () => {
    mocks.findUnique.mockResolvedValue(tipster);

    await expect(createTipster({ name: "EL PROFESSOR" })).resolves.toEqual({
      success: true,
      tipster: expect.objectContaining({ id: "tipster-a" }),
      existing: true,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("interdit la modification d'un Tipster non possédé", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(updateTipster("tipster-b", { name: "Intrus" })).resolves.toEqual({
      success: false,
      error: "Tipster introuvable.",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("interdit l'archivage d'un Tipster non possédé", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(archiveTipster("tipster-b")).resolves.toEqual({
      success: false,
      error: "Tipster introuvable.",
    });
  });
});
