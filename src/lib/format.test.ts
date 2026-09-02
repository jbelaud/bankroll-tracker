import { describe, expect, it } from "vitest";
import { fmtStakeUnits } from "./format";

describe("fmtStakeUnits", () => {
  it("converts a euro stake from the fixed reference amount", () => {
    expect(fmtStakeUnits(10, 1_000, "fr-FR")).toBe("1 u");
    expect(fmtStakeUnits(12.5, 1_000, "fr-FR")).toBe("1,25 u");
  });

  it("keeps the same unit value when the real balance changes", () => {
    expect(fmtStakeUnits(10, 1_000, "fr-FR")).toBe("1 u");
  });

  it("does not invent units without a reference amount", () => {
    expect(fmtStakeUnits(10, null, "fr-FR")).toBeNull();
  });
});
