import { describe, expect, it } from "vitest";
import { SPORTS } from "@/lib/sports";
import { resolveHomogeneousCombineSport } from "./combine-sport";

describe("resolveHomogeneousCombineSport", () => {
  it("recovers Tennis from four tennis legs even when the ticket says Football", () => {
    const selections = ["Tennis", "Tennis", "Tennis", "Tennis"].map((sport) => ({ sport }));
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Football", selections)).toBe("Tennis");
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Autre sport", selections)).toBe("Tennis");
  });

  it("does not invent a sport for mixed, unknown or incomplete legs", () => {
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Autre sport", [
      { sport: "Tennis" }, { sport: "Football" },
    ])).toBe("Autre sport");
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Autre sport", [
      { sport: "Tennis" }, { sport: "Autre sport" },
    ])).toBe("Autre sport");
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Autre sport", [
      { sport: "Sport inconnu" }, { sport: "Sport inconnu" },
    ])).toBe("Autre sport");
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Autre sport", [
      { sport: "Tennis" },
    ])).toBe("Autre sport");
  });

  it("does not override a simple bet or a specific two-leg ticket", () => {
    const selections = [{ sport: "Tennis" }, { sport: "Tennis" }];
    expect(resolveHomogeneousCombineSport(SPORTS, "SIMPLE", "Autre sport", selections)).toBe("Autre sport");
    expect(resolveHomogeneousCombineSport(SPORTS, "COMBINE", "Football", selections)).toBe("Football");
  });
});
