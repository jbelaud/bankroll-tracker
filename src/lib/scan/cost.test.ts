import { describe, expect, it } from "vitest";
import { calculateScanCostUsd } from "./cost";

describe("calculateScanCostUsd", () => {
  it("uses Haiku 4.5 input and output prices", () => {
    // 1,568 tokens image + prompt, 500 tokens JSON returned.
    expect(calculateScanCostUsd(1_568, 500)).toBeCloseTo(0.004068);
  });
});
