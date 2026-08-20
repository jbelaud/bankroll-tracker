import { describe, expect, it } from "vitest";
import { hasInitialScanCredits, isPaidPlan } from "./plans";
import { HOURLY_SCAN_LIMITS } from "@/lib/scan/rate-limit";
import { SCAN_QUOTA_CONFIG } from "@/lib/scan/monthly-quota";
import { activeBankrollLimit, isBankrollLocked } from "./bankroll-limits";

describe("beta tester plan", () => {
  it("grants beta testers 50 scans per 30-day window and four active bankrolls without treating them as paid", () => {
    expect(SCAN_QUOTA_CONFIG.BETA_TESTER).toMatchObject({ limit: 50 });
    expect(HOURLY_SCAN_LIMITS.BETA_TESTER).toBe(HOURLY_SCAN_LIMITS.FREE);
    expect(activeBankrollLimit("BETA_TESTER")).toBe(4);
    expect(isBankrollLocked("BETA_TESTER", 3)).toBe(false);
    expect(isBankrollLocked("BETA_TESTER", 4)).toBe(true);
    expect(isPaidPlan("BETA_TESTER")).toBe(false);
    expect(hasInitialScanCredits("BETA_TESTER")).toBe(false);
  });

  it("keeps paid benefits restricted to Stripe-backed plans", () => {
    expect(isPaidPlan("FREE")).toBe(false);
    expect(isPaidPlan("BETA_PREMIUM")).toBe(true);
    expect(isPaidPlan("PREMIUM")).toBe(true);
  });

  it("keeps the two oldest bankrolls active when a user returns to Freemium", () => {
    expect(activeBankrollLimit("FREE")).toBe(2);
    expect(isBankrollLocked("FREE", 0)).toBe(false);
    expect(isBankrollLocked("FREE", 1)).toBe(false);
    expect(isBankrollLocked("FREE", 2)).toBe(true);
    expect(isBankrollLocked("FREE", 3)).toBe(true);
  });
});
