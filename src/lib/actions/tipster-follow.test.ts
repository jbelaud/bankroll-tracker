import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  transaction: vi.fn(),
  userFindFirst: vi.fn(),
  followFindUnique: vi.fn(),
  followCreate: vi.fn(),
  followDelete: vi.fn(),
  followCount: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

const { toggleTipsterFollow } = await import("@/lib/actions/tipster-follow");

function form(handle = "egs_betting") {
  const data = new FormData();
  data.set("handle", handle);
  data.set("locale", "fr");
  data.set("bankrollSlug", "bankroll-publique");
  return data;
}

describe("suivi public d’un tipster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "viewer-a" });
    mocks.userFindFirst.mockResolvedValue({ id: "tipster-a" });
    mocks.followFindUnique.mockResolvedValue(null);
    mocks.followCount.mockResolvedValue(1);
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findFirst: mocks.userFindFirst },
      tipsterFollow: {
        findUnique: mocks.followFindUnique,
        create: mocks.followCreate,
        delete: mocks.followDelete,
        count: mocks.followCount,
      },
    }));
  });

  it("ajoute un suivi de tipster sans suivre automatiquement ses bankrolls", async () => {
    await expect(toggleTipsterFollow({ following: false, followerCount: 0 }, form())).resolves.toEqual({
      following: true,
      followerCount: 1,
    });
    expect(mocks.followCreate).toHaveBeenCalledWith({ data: { followerId: "viewer-a", tipsterId: "tipster-a" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/fr/p/bankroll-publique");
  });

  it("retire uniquement le suivi du tipster lorsqu’il existe déjà", async () => {
    mocks.followFindUnique.mockResolvedValue({ id: "follow-a" });
    mocks.followCount.mockResolvedValue(0);

    await expect(toggleTipsterFollow({ following: true, followerCount: 1 }, form())).resolves.toEqual({
      following: false,
      followerCount: 0,
    });
    expect(mocks.followDelete).toHaveBeenCalledWith({ where: { id: "follow-a" } });
    expect(mocks.followCreate).not.toHaveBeenCalled();
  });

  it("interdit de suivre son propre profil", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "viewer-a" });

    await expect(toggleTipsterFollow({ following: false, followerCount: 0 }, form())).resolves.toEqual({
      following: false,
      followerCount: 0,
      error: "Tu ne peux pas suivre ton propre profil.",
    });
    expect(mocks.followCreate).not.toHaveBeenCalled();
  });
});
