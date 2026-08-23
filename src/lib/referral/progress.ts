import { BETA_REFERRAL_CONFIG } from "./config";

export type ReferralProgress = {
  status: "REGISTERED" | "FIRST_SCAN" | "FIVE_SCANS" | "COMPLETE";
  referrerScansUnlocked: number;
  scansUntilNextReward: number;
};

/** Pure helper shared by the server view and tests. */
export function referralProgress(validScanCount: number): ReferralProgress {
  const scans = Math.max(0, validScanCount);
  if (scans >= BETA_REFERRAL_CONFIG.secondRewardRequiredValidScans) {
    return {
      status: "COMPLETE",
      referrerScansUnlocked: BETA_REFERRAL_CONFIG.maxReferrerRewardPerReferral,
      scansUntilNextReward: 0,
    };
  }
  if (scans >= 1) {
    return {
      status: "FIRST_SCAN",
      referrerScansUnlocked: BETA_REFERRAL_CONFIG.referrerFirstValidScanReward,
      scansUntilNextReward: BETA_REFERRAL_CONFIG.secondRewardRequiredValidScans - scans,
    };
  }
  return {
    status: "REGISTERED",
    referrerScansUnlocked: 0,
    scansUntilNextReward: 1,
  };
}
