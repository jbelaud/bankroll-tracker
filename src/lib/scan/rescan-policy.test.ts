import { describe, expect, it } from "vitest";
import { canRescanAfterPromptUpgrade } from "./rescan-policy";

describe("scan rescan policy", () => {
  it("allows an old capture to be analyzed by a newer prompt", () => {
    expect(canRescanAfterPromptUpgrade(
      "2026-09-06-unibet-status-and-review-sync-v3",
      "2026-09-06-unibet-literal-date-v4"
    )).toBe(true);
  });

  it("keeps duplicate protection within the same prompt version", () => {
    expect(canRescanAfterPromptUpgrade(
      "2026-09-06-unibet-literal-date-v4",
      "2026-09-06-unibet-literal-date-v4"
    )).toBe(false);
  });

  it("lets legacy scans without a version use the current extractor once", () => {
    expect(canRescanAfterPromptUpgrade(null, "2026-09-06-unibet-literal-date-v4")).toBe(true);
  });
});
