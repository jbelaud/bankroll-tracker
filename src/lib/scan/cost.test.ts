import { describe, expect, it } from "vitest";
import { calculateScanCostUsd } from "./cost";

describe("calculateScanCostUsd", () => {
  it("uses the configured Haiku 4.5 prices", () => {
    // 1,568 tokens image + prompt, 500 tokens JSON returned.
    expect(calculateScanCostUsd("claude-haiku-4-5", 1_568, 500)).toBeCloseTo(0.004068);
  });

  it("uses Gemini Flash and Flash-Lite prices", () => {
    expect(calculateScanCostUsd("gemini-3.6-flash", 1_568, 500)).toBeCloseTo(0.006102);
    expect(calculateScanCostUsd("gemini-3.5-flash-lite", 1_568, 500)).toBeCloseTo(0.0017204);
  });
});
