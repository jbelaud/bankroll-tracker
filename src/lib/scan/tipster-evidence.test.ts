import { describe, expect, it } from "vitest";
import { tipsterFromVisibleEvidence } from "./tipster-evidence";

describe("tipster evidence", () => {
  it("rejects a participant copied into the tipster field", () => {
    expect(tipsterFromVisibleEvidence({
      candidate: "Joel Josef Schwarzler",
      evidence: null,
      description: "Joel Josef Schwarzler — Buteur du match",
      selectionLabels: ["Joel Josef Schwarzler — Buteur du match"],
    })).toBeNull();
  });

  it("rejects a participant even when fabricated evidence repeats it", () => {
    expect(tipsterFromVisibleEvidence({
      candidate: "Joel Josef Schwarzler",
      evidence: "Tipster : Joel Josef Schwarzler",
      description: "Joel Josef Schwarzler — Buteur du match",
      selectionLabels: [],
    })).toBeNull();
  });

  it("accepts a separately labelled visible tipster", () => {
    expect(tipsterFromVisibleEvidence({
      candidate: "PronoMax",
      evidence: "Pronostiqueur : PronoMax",
      description: "Victoire — Toulouse",
      selectionLabels: ["Toulouse"],
    })).toBe("PronoMax");
  });

  it("rejects an unlabelled username", () => {
    expect(tipsterFromVisibleEvidence({
      candidate: "@PronoMax",
      evidence: "@PronoMax",
      description: "Victoire — Toulouse",
      selectionLabels: [],
    })).toBeNull();
  });
});
