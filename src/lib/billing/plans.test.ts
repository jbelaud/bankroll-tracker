import { describe, expect, it } from "vitest";
import { hasInitialScanCredits, isPaidPlan } from "./plans";
import { HOURLY_SCAN_LIMITS } from "@/lib/scan/rate-limit";
import { MONTHLY_LIMITS } from "@/lib/scan/monthly-quota";

describe("beta tester plan", () => {
  it("grants beta testers 50 scans per 30-day window without treating them as paid", () => {
    expect(MONTHLY_LIMITS.BETA_TESTER).toBe(50);
    expect(HOURLY_SCAN_LIMITS.BETA_TESTER).toBe(HOURLY_SCAN_LIMITS.FREE);
    expect(isPaidPlan("BETA_TESTER")).toBe(false);
    expect(hasInitialScanCredits("BETA_TESTER")).toBe(false);
  });

  it("keeps paid benefits restricted to Stripe-backed plans", () => {
    expect(isPaidPlan("FREE")).toBe(false);
    expect(isPaidPlan("BETA_PREMIUM")).toBe(true);
    expect(isPaidPlan("PREMIUM")).toBe(true);
  });
});
