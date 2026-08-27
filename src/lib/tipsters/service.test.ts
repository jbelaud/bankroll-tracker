import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { tipster: { findFirst: mocks.findFirst, findUnique: mocks.findUnique, findMany: mocks.findMany } },
}));

const { resolveOwnedTipsterId, resolveOwnedTipsterIdsForImport } = await import("@/lib/tipsters/service");

describe("resolveOwnedTipsterId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepte l'absence explicite de Tipster", async () => {
    await expect(resolveOwnedTipsterId("user-a", { tipsterId: null })).resolves.toBeNull();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("valide toujours l'ID dans le périmètre de l'utilisateur", async () => {
    mocks.findFirst.mockResolvedValue({ id: "tipster-a" });

    await expect(resolveOwnedTipsterId("user-a", { tipsterId: "tipster-a" })).resolves.toBe("tipster-a");
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: "tipster-a", userId: "user-a", status: "ACTIVE" },
      select: { id: true },
    });
  });

  it("refuse l'ID d'un autre utilisateur", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(resolveOwnedTipsterId("user-a", { tipsterId: "tipster-b" }))
      .rejects.toThrow("Tipster introuvable.");
  });

  it("matche un nom détecté actif sans créer un inconnu", async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: "tipster-a", status: "ACTIVE" });
    await expect(resolveOwnedTipsterId("user-a", { detectedTipsterName: " EL  PROFESSOR " }))
      .resolves.toBe("tipster-a");

    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(resolveOwnedTipsterId("user-a", { detectedTipsterName: "Inconnu" }))
      .resolves.toBeNull();
  });

  it("n'auto-matche pas un Tipster archivé", async () => {
    mocks.findUnique.mockResolvedValue({ id: "tipster-a", status: "ARCHIVED" });
    await expect(resolveOwnedTipsterId("user-a", { detectedTipsterName: "El Professor" }))
      .resolves.toBeNull();
  });
});

describe("resolveOwnedTipsterIdsForImport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("résout les IDs et noms détectés en une seule requête utilisateur", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "tipster-a", normalizedName: "el professor" },
      { id: "tipster-b", normalizedName: "valuebetfr" },
    ]);

    await expect(resolveOwnedTipsterIdsForImport("user-a", [
      { tipsterId: "tipster-a" },
      { detectedTipsterName: "VALUEBETFR" },
      { detectedTipsterName: "Inconnu" },
      { tipsterId: null, detectedTipsterName: "El Professor" },
    ])).resolves.toEqual(["tipster-a", "tipster-b", null, null]);

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "user-a", status: "ACTIVE" }),
    }));
  });

  it("refuse tout ID explicite qui n'appartient pas à l'utilisateur", async () => {
    mocks.findMany.mockResolvedValue([]);

    await expect(resolveOwnedTipsterIdsForImport("user-a", [{ tipsterId: "tipster-b" }]))
      .rejects.toThrow("Tipster introuvable.");
  });
});
