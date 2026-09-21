import { describe, expect, it } from "vitest";
import { SCAN_PROMPT_VERSION } from "./quality";
import { isCurrentScanDraft } from "./scan-draft-version";

describe("scan draft versioning", () => {
  it("accepts only drafts produced entirely by the current extraction contract", () => {
    expect(isCurrentScanDraft([{ promptVersion: SCAN_PROMPT_VERSION }])).toBe(true);
    expect(isCurrentScanDraft([{ promptVersion: "older-version" }])).toBe(false);
    expect(isCurrentScanDraft([{}])).toBe(false);
    expect(isCurrentScanDraft([])).toBe(false);
  });
});
