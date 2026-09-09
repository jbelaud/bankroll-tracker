import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isLocked: vi.fn(),
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  queryRaw: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/billing/bankroll-access", () => ({ isBankrollLockedForUser: mocks.isLocked }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankroll: { findFirst: mocks.findFirst },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRaw: mocks.queryRaw,
      bankroll: { findUniqueOrThrow: mocks.findUniqueOrThrow, update: mocks.update },
    }),
  },
}));

const { setBankrollPublication } = await import("./bankroll-publication");

function publicationForm(publish: boolean) {
  const form = new FormData();
  form.set("bankrollId", "bankroll-a");
  form.set("publish", String(publish));
  return form;
}

describe("cycle de publication certifiée", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.isLocked.mockResolvedValue(false);
    mocks.findFirst.mockResolvedValue({ id: "bankroll-a" });
    mocks.queryRaw.mockResolvedValue([]);
    mocks.update.mockResolvedValue({ id: "bankroll-a" });
  });

  it("masque la page sans effacer le démarrage de certification", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      isPublic: true,
      publicSlug: "public-a",
      certificationStartedAt: new Date("2026-08-01T00:00:00Z"),
      referenceCapital: 1000,
      _count: { bets: 0 },
    });

    await setBankrollPublication({}, publicationForm(false));

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "bankroll-a" },
      data: { isPublic: false, publishedAt: null },
    });
  });

  it("reprend la date historique lors d’une republication", async () => {
    const startedAt = new Date("2026-08-01T00:00:00Z");
    mocks.findUniqueOrThrow.mockResolvedValue({
      isPublic: false,
      publicSlug: "public-a",
      certificationStartedAt: startedAt,
      referenceCapital: 1000,
      _count: { bets: 0 },
    });

    await setBankrollPublication({}, publicationForm(true));

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "bankroll-a" },
      data: expect.objectContaining({
        isPublic: true,
        publicSlug: "public-a",
        certificationStartedAt: startedAt,
      }),
    }));
  });
});
