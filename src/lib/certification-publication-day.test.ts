import { describe, expect, it } from "vitest";
import { certificationStatus, certificationSummary, type CertificationBet } from "./certification";

const startedAt = new Date("2026-09-18T11:30:00Z");

function manualBet(overrides: Partial<CertificationBet> = {}): CertificationBet {
  return {
    createdAt: new Date("2026-09-18T11:45:00Z"),
    date: new Date("2026-09-18T00:00:00Z"),
    result: "EN_ATTENTE",
    stakeUnits: 1,
    entryMethod: "MANUAL",
    initialProofAt: null,
    initialProofBeforeEvent: null,
    resultProofAt: null,
    resultEntryMethod: "UNKNOWN",
    ...overrides,
  };
}

describe("certification on publication day", () => {
  it("tracks a date-only manual bet created after activation on the same day", () => {
    const current = manualBet();
    expect(certificationStatus(current, startedAt)).toBe("UNVERIFIED");
    expect(certificationSummary([current], startedAt)).toMatchObject({
      publishedBets: 1,
      pendingBets: 1,
      volume: 0,
      score: null,
    });
  });

  it("keeps bets recorded before activation and earlier-day tickets outside certification", () => {
    expect(certificationStatus(manualBet({ createdAt: new Date("2026-09-18T11:00:00Z") }), startedAt)).toBe("EXCLUDED");
    expect(certificationStatus(manualBet({ date: new Date("2026-09-17T00:00:00Z") }), startedAt)).toBe("EXCLUDED");
  });

  it("does not treat a manually settled bet without proof as certified", () => {
    const settled = manualBet({ result: "GAGNE", resultEntryMethod: "MANUAL" });
    expect(certificationStatus(settled, startedAt)).toBe("UNVERIFIED");
    expect(certificationSummary([settled], startedAt)).toMatchObject({ publishedBets: 1, score: 0 });
  });
});
