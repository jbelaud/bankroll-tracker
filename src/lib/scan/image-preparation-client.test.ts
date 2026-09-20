import { describe, expect, it } from "vitest";
import { scanImageScale } from "./image-preparation-client";

describe("scanImageScale", () => {
  it("agrandit trois fois une petite capture PMU", () => {
    expect(scanImageScale(433, 279)).toBe(3);
  });

  it("ne modifie pas une image déjà suffisamment grande", () => {
    expect(scanImageScale(1200, 900)).toBe(1);
  });

  it("limite le plus grand côté à 2048 pixels", () => {
    expect(scanImageScale(900, 400)).toBe(2);
  });
});
