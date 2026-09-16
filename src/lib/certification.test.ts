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

  it("excludes a historical event imported after publication from the score", () => {
    const historical = bet({ date: new Date("2026-08-31T00:00:00Z"), createdAt: new Date("2026-09-02T10:00:00Z") });
    expect(certificationStatus(historical, startedAt)).toBe("EXCLUDED");
    expect(certificationSummary([historical], startedAt)).toMatchObject({ publishedBets: 0, volume: 0, score: null });
  });

  it("does not infer whether an event on publication day was already over", () => {
    expect(certificationStatus(bet({ date: new Date("2026-09-01T00:00:00Z"), initialProofBeforeEvent: null }), startedAt)).toBe("LIMITED");
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
