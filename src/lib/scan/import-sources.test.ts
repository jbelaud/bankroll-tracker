import { describe, expect, it } from "vitest";
import { scanUsageIdForSourceIndex, scanUsageIdsBySourceIndex } from "./import-sources";

describe("scan import source mapping", () => {
  it("keeps original indexes when the first screenshot is empty", () => {
    const usageIds = scanUsageIdsBySourceIndex([
      { sourceFileIndex: 0, usageId: "empty-scan", outcome: "EMPTY" },
      { sourceFileIndex: 1, usageId: "ready-1", outcome: "READY" },
      { sourceFileIndex: 2, usageId: "ready-2", outcome: "READY" },
      { sourceFileIndex: 3, usageId: "ready-3", outcome: "READY" },
    ]);

    expect(usageIds).toEqual(["", "ready-1", "ready-2", "ready-3"]);
    expect(scanUsageIdForSourceIndex(usageIds, 1)).toBe("ready-1");
    expect(scanUsageIdForSourceIndex(usageIds, 3)).toBe("ready-3");
  });

  it("keeps sparse indexes when another screenshot was skipped", () => {
    const usageIds = scanUsageIdsBySourceIndex([
      { sourceFileIndex: 2, usageId: "ready-2", outcome: "READY" },
    ]);

    expect(usageIds).toEqual(["", "", "ready-2"]);
    expect(scanUsageIdForSourceIndex(usageIds, 0)).toBeNull();
    expect(scanUsageIdForSourceIndex(usageIds, 2)).toBe("ready-2");
  });
});
