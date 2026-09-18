import { describe, expect, it } from "vitest";
import { certificationStatus, certificationSummary, type CertificationBet } from "./certification";

const startedAt = new Date("2026-09-01T10:00:00Z");

function bet(overrides: Partial<CertificationBet> = {}): CertificationBet {
  return {
    createdAt: new Date("2026-09-02T10:00:00Z"), date: new Date("2026-09-03T00:00:00Z"), result: "PERDU", stakeUnits: 1,
    entryMethod: "SCAN", initialProofAt: new Date("2026-09-02T09:00:00Z"),
    initialProofBeforeEvent: true, resultProofAt: new Date("2026-09-03T09:00:00Z"),
    resultEntryMethod: "SCAN", ...overrides,
  };
}

describe("Kalivoa certification", () => {
  it("never certifies bets created before public certification starts", () => {
    expect(certificationStatus(bet({ createdAt: new Date("2026-08-31") }), startedAt)).toBe("EXCLUDED");
  });

  it("excludes a pre-publication ticket without a qualified post-publication scan", () => {
    const historical = bet({ date: new Date("2026-08-31T00:00:00Z"), createdAt: new Date("2026-09-02T10:00:00Z") });
    expect(certificationStatus({ ...historical, initialProofAt: null }, startedAt)).toBe("EXCLUDED");
    expect(certificationSummary([{ ...historical, initialProofAt: null }], startedAt)).toMatchObject({ publishedBets: 0, volume: 0, score: null });
  });

  it("accepts a ticket placed before publication when both scans prove the later event", () => {
    const pmu = bet({
      date: new Date("2026-09-14T12:00:00Z"),
      createdAt: new Date("2026-09-17T18:26:52Z"),
      initialProofAt: new Date("2026-09-17T18:26:20Z"),
      initialProofBeforeEvent: true,
      resultProofAt: new Date("2026-09-17T20:58:19Z"),
      result: "GAGNE",
      stakeUnits: 0.5,
    });
    const certificationStart = new Date("2026-09-16T00:48:43Z");
    expect(certificationStatus(pmu, certificationStart)).toBe("STRONG");
    expect(certificationSummary([pmu], certificationStart)).toMatchObject({
      publishedBets: 1, volume: 0.5, score: 100, level: "OBSERVATION",
    });
  });

  it("does not use a scan made before publication to certify an older ticket", () => {
    expect(certificationStatus(bet({
      date: new Date("2026-08-31T00:00:00Z"),
      initialProofAt: new Date("2026-08-31T08:00:00Z"),
    }), startedAt)).toBe("EXCLUDED");
  });

  it("does not infer event timing from the ticket date on publication day", () => {
    expect(certificationStatus(bet({ date: new Date("2026-09-01T12:00:00Z"), initialProofBeforeEvent: null }), startedAt)).toBe("LIMITED");
  });

  it("maps the five evidence combinations without overstating unknown timing", () => {
    expect(certificationStatus(bet(), startedAt)).toBe("STRONG");
    expect(certificationStatus(bet({ resultProofAt: null, resultEntryMethod: "MANUAL" }), startedAt)).toBe("PARTIAL");
    expect(certificationStatus(bet({ entryMethod: "MANUAL", initialProofAt: null, initialProofBeforeEvent: null }), startedAt)).toBe("WEAK");
    expect(certificationStatus(bet({ initialProofAt: null, initialProofBeforeEvent: null }), startedAt)).toBe("LIMITED");
    expect(certificationStatus(bet({ initialProofBeforeEvent: null, resultProofAt: null, resultEntryMethod: "MANUAL" }), startedAt)).toBe("UNVERIFIED");
  });

  it("weights the score by unit volume and keeps small samples in observation", () => {
    const summary = certificationSummary([
      bet({ stakeUnits: 3 }),
      bet({ stakeUnits: 1, initialProofAt: null, initialProofBeforeEvent: null, resultProofAt: null, resultEntryMethod: "MANUAL" }),
    ], startedAt);
    expect(summary.score).toBe(75);
    expect(summary.strongVolumePercent).toBe(75);
    expect(summary.level).toBe("OBSERVATION");
  });
});
