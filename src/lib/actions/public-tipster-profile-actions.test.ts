import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findUnique: vi.fn(),
  updateUser: vi.fn(),
  updateManyBankrolls: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique, update: mocks.updateUser },
    bankroll: { updateMany: mocks.updateManyBankrolls },
    $transaction: mocks.transaction,
  },
}));

const { deletePublicTipsterProfile, setPublicTipsterProfileSuspended } = await import("./public-tipster-profile");

describe("visibilité du profil public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.findUnique.mockResolvedValue({ publicHandle: "tipster-a", publicDisplayName: "Tipster A" });
    mocks.updateUser.mockReturnValue({ operation: "user-update" });
    mocks.updateManyBankrolls.mockReturnValue({ operation: "bankroll-update-many" });
    mocks.transaction.mockResolvedValue([]);
  });

  it("suspend uniquement le profil du compte connecté", async () => {
    const form = new FormData();
    form.set("suspended", "true");

    expect(await setPublicTipsterProfileSuspended({}, form)).toEqual({
      success: "Profil public suspendu. Il n’est plus visible ni accessible publiquement.",
    });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "user-a" },
      select: { publicHandle: true, publicDisplayName: true },
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: { publicProfileSuspended: true },
    });
  });

  it("refuse une suppression sans confirmation explicite", async () => {
    const form = new FormData();

    expect(await deletePublicTipsterProfile({}, form)).toEqual({ error: "Confirmation invalide." });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("efface l’identité et masque uniquement les bankrolls publiques du compte", async () => {
    const form = new FormData();
    form.set("confirmation", "SUPPRIMER");

    expect(await deletePublicTipsterProfile({}, form)).toEqual({
      success: "Profil public supprimé. Tes bankrolls, tes paris et leur historique de certification sont conservés en privé.",
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: {
        publicDisplayName: null,
        publicHandle: null,
        publicBio: null,
        publicAvatarUrl: null,
        publicBannerUrl: null,
        publicXHandle: null,
        publicProfileSuspended: false,
      },
    });
    expect(mocks.updateManyBankrolls).toHaveBeenCalledWith({
      where: { userId: "user-a", isPublic: true },
      data: { isPublic: false, publishedAt: null },
    });
    expect(mocks.transaction).toHaveBeenCalledWith([
      { operation: "user-update" },
      { operation: "bankroll-update-many" },
    ]);
  });
});
