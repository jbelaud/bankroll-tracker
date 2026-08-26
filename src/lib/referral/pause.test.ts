import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("server-only", () => ({}));

delete process.env.BETA_REFERRAL_ENABLED;
const { BETA_REFERRAL_CONFIG } = await import("./config");
const { processValidReferralScan } = await import("./service");

describe("pause du parrainage utilisateur", () => {
  it("est désactivé par défaut et ne crée aucune récompense", async () => {
    expect(BETA_REFERRAL_CONFIG.enabled).toBe(false);

    await expect(processValidReferralScan("user-1", "scan-1")).resolves.toEqual({
      earnedReferralScans: 0,
      grants: [],
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
