import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { tipster: { findMany: mocks.findMany } } }));

const { getTipsterPerformances } = await import("./analytics");

describe("Tipster analytics ownership", () => {
  beforeEach(() => mocks.findMany.mockReset().mockResolvedValue([]));

  it("filtre les Tipsters et leurs paris par le propriétaire authentifié", async () => {
    await getTipsterPerformances({
      userId: "user-a",
      tipsterId: "tipster-a",
      betIds: ["bet-a"],
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-a", id: "tipster-a" },
      select: expect.objectContaining({
        bets: expect.objectContaining({
          where: expect.objectContaining({
            bankroll: { userId: "user-a" },
            id: { in: ["bet-a"] },
            date: {
              gte: new Date("2026-09-01T00:00:00.000Z"),
              lte: new Date("2026-09-30T23:59:59.999Z"),
            },
          }),
        }),
      }),
    }));
  });
});
