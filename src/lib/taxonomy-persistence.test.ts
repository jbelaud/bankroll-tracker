import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userTaxonomyEntry: { createMany: mocks.createMany },
  },
}));

const { saveUserTaxonomyEntries } = await import("./taxonomy");

describe("persistance de la taxonomie personnelle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMany.mockResolvedValue({ count: 1 });
  });

  it("déduplique les couples d'un pari et ignore les collisions existantes", async () => {
    await saveUserTaxonomyEntries("user-a", [
      { sport: "Padel", betType: "Nombre de jeux" },
      { sport: "Padel", betType: "Nombre de jeux" },
      { sport: "Football", betType: "Buteur" },
    ]);

    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-a", sport: "Padel", betType: "Nombre de jeux" }],
      skipDuplicates: true,
    });
  });
});
