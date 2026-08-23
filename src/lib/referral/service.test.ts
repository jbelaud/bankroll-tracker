import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    scanUsage: { updateMany: vi.fn() },
    referral: { findUnique: vi.fn(), update: vi.fn() },
    referralReward: { create: vi.fn() },
    user: { update: vi.fn() },
  };
  return {
    tx,
    prisma: { $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("server-only", () => ({}));

const { processValidReferralScan } = await import("./service");

describe("attribution transactionnelle des récompenses de parrainage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
    mocks.tx.scanUsage.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.referralReward.create.mockResolvedValue({});
    mocks.tx.user.update.mockResolvedValue({});
  });

  it("accorde exactement 10 scans au filleul et 10 au parrain après le premier scan", async () => {
    mocks.tx.referral.findUnique.mockResolvedValue({
      id: "referral-1",
      referrerId: "referrer-1",
      validScanCount: 0,
      suspiciousAt: null,
    });
    mocks.tx.referral.update.mockResolvedValue({ validScanCount: 1 });

    await expect(processValidReferralScan("referred-1", "scan-1")).resolves.toMatchObject({
      earnedReferralScans: 10,
      grants: [
        { beneficiaryId: "referred-1", amount: 10, type: "REFEREE_FIRST_VALID_SCAN" },
        { beneficiaryId: "referrer-1", amount: 10, type: "REFERRER_FIRST_VALID_SCAN" },
      ],
    });
    expect(mocks.tx.referralReward.create).toHaveBeenCalledTimes(2);
    expect(mocks.tx.user.update).toHaveBeenCalledTimes(2);
  });

  it("ne crédite rien quand le même événement est rejoué", async () => {
    mocks.tx.scanUsage.updateMany.mockResolvedValue({ count: 0 });

    await expect(processValidReferralScan("referred-1", "scan-1")).resolves.toEqual({
      earnedReferralScans: 0,
      grants: [],
    });
    expect(mocks.tx.referral.update).not.toHaveBeenCalled();
    expect(mocks.tx.referralReward.create).not.toHaveBeenCalled();
  });

  it("accorde uniquement les 10 scans supplémentaires au parrain au cinquième scan", async () => {
    mocks.tx.referral.findUnique.mockResolvedValue({
      id: "referral-1",
      referrerId: "referrer-1",
      validScanCount: 4,
      suspiciousAt: null,
    });
    mocks.tx.referral.update.mockResolvedValue({ validScanCount: 5 });

    await expect(processValidReferralScan("referred-1", "scan-5")).resolves.toMatchObject({
      earnedReferralScans: 0,
      grants: [{ beneficiaryId: "referrer-1", amount: 10, type: "REFERRER_FIFTH_VALID_SCAN" }],
    });
    expect(mocks.tx.referralReward.create).toHaveBeenCalledTimes(1);
  });

  it("suspend les nouveaux gains d'une relation signalée", async () => {
    mocks.tx.referral.findUnique.mockResolvedValue({
      id: "referral-1",
      referrerId: "referrer-1",
      validScanCount: 1,
      suspiciousAt: new Date(),
    });

    await expect(processValidReferralScan("referred-1", "scan-2")).resolves.toEqual({
      earnedReferralScans: 0,
      grants: [],
    });
    expect(mocks.tx.referral.update).not.toHaveBeenCalled();
    expect(mocks.tx.referralReward.create).not.toHaveBeenCalled();
  });
});
