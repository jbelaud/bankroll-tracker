import { describe, expect, it } from "vitest";
import { canAddCapture, cropBounds, MAX_BYTES, MAX_IMAGE_BYTES } from "./policy";
describe("capture limits", () => {
  it("supports 100 captures but refuses a 101st", () => {
    expect(canAddCapture(99, 99 * 200_000, 200_000)).toBe(true);
    expect(canAddCapture(100, 0, 1)).toBe(false);
  });
  it("rejects empty, oversized and over-budget images", () => {
    expect(canAddCapture(0, 0, 0)).toBe(false);
    expect(canAddCapture(0, 0, MAX_IMAGE_BYTES + 1)).toBe(false);
    expect(canAddCapture(1, MAX_BYTES, 1)).toBe(false);
    expect(canAddCapture(1, MAX_BYTES - 10, 10)).toBe(true);
  });
});
describe("crop geometry", () => {
  it("accounts for HiDPI screens independently of CSS pixels", () => {
    expect(cropBounds({ x: 50, y: 20, width: 200, height: 300 }, { width: 1000, height: 800 }, { width: 2000, height: 1600 }))
      .toEqual({ x: 100, y: 40, width: 400, height: 600 });
  });
  it("supports fractional zoom and clamps the last pixel", () => {
    const bounds = cropBounds({ x: 80, y: 80, width: 20, height: 20 }, { width: 100, height: 100 }, { width: 125, height: 125 });
    expect(bounds).toEqual({ x: 100, y: 100, width: 25, height: 25 });
  });
  it.each([
    { x: -1, y: 0, width: 40, height: 40 },
    { x: 0, y: 0, width: 5, height: 40 },
    { x: 80, y: 0, width: 40, height: 40 },
    { x: NaN, y: 0, width: 40, height: 40 },
  ])("rejects invalid or unreadably small rectangles", (rect) => {
    expect(() => cropBounds(rect, { width: 100, height: 100 }, { width: 100, height: 100 })).toThrow();
  });
});
