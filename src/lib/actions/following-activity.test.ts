import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: mocks.update } } }));

const { markFollowingViewed } = await import("@/lib/actions/following-activity");

describe("lecture du fil d’activité", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "viewer-a" });
    mocks.update.mockResolvedValue({ id: "viewer-a" });
  });

  it("enregistre la lecture uniquement pour l’utilisateur authentifié", async () => {
    const form = new FormData();
    form.set("locale", "fr");
    await markFollowingViewed(form);

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "viewer-a" },
      data: { followingLastViewedAt: expect.any(Date) },
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/fr/following");
  });

  it("refuse une locale forgée", async () => {
    const form = new FormData();
    form.set("locale", "../../admin");
    await markFollowingViewed(form);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
