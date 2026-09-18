import { describe, expect, it } from "vitest";
import { SPORTS } from "@/lib/sports";
import { resolveHomogeneousCombineSport } from "./combine-sport";

describe("homogeneous accumulator sport", () => {
  it("corrects a football top-level label when all four legs are tennis", () => {
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Football", [
      { sport: "Tennis" }, { sport: "Tennis" }, { sport: "Tennis" }, { sport: "Tennis" },
    ])).toBe("Tennis");
  });

  it("does not guess from mixed, missing or unknown legs", () => {
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Football", [
      { sport: "Tennis" }, { sport: "Football" },
    ])).toBe("Football");
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Autre sport", [
      { sport: "Tennis" }, { sport: "Autre sport" },
    ])).toBe("Autre sport");
    expect(resolveHomogeneousCombineSport(SPORTS, "SIMPLE", "Football", [
      { sport: "Tennis" }, { sport: "Tennis" },
    ])).toBe("Football");
  });
});
