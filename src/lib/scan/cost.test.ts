import { describe, expect, it, vi } from "vitest";
import { calculateScanCostUsd } from "./cost";

describe("calculateScanCostUsd", () => {
  it("uses the configured Haiku 4.5 prices", () => {
    // 1,568 tokens image + prompt, 500 tokens JSON returned.
    expect(calculateScanCostUsd("claude-haiku-4-5", 1_568, 500)).toBeCloseTo(0.004068);
  });

  it("uses the configured Sonnet 4.6 prices", () => {
    expect(calculateScanCostUsd("claude-sonnet-4-6", 1_568, 500)).toBeCloseTo(0.012204);
  });

  it("uses Gemini Flash and Flash-Lite prices", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-29T00:00:00Z"));
      expect(calculateScanCostUsd("gemini-3.6-flash", 1_568, 500)).toBeCloseTo(0.003051);
      expect(calculateScanCostUsd("gemini-3.5-flash-lite", 1_568, 500)).toBeCloseTo(0.0017204);
      vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
      expect(calculateScanCostUsd("gemini-3.6-flash", 1_568, 500)).toBeCloseTo(0.006102);
    } finally {
      vi.useRealTimers();
    }
  });
});
