import type { BetEntryMethod, BetResult } from "@prisma/client";

export type CertificationStatus =
  | "EXCLUDED"
  | "AWAITING_RESULT"
  | "TIMING_UNCONFIRMED"
  | "STRONG"
  | "PARTIAL"
  | "WEAK"
  | "LIMITED"
  | "UNVERIFIED";

export type CertificationBet = {
  createdAt: Date;
  result: BetResult;
  stakeUnits: number | null;
  entryMethod: BetEntryMethod;
  initialProofAt: Date | null;
  initialProofBeforeEvent: boolean | null;
  resultProofAt: Date | null;
  resultEntryMethod: BetEntryMethod;
};

export const CERTIFICATION_RULES_VERSION = "1.0";

export const CERTIFICATION_WEIGHTS: Record<Extract<CertificationStatus, "STRONG" | "PARTIAL" | "WEAK" | "LIMITED" | "UNVERIFIED">, number> = {
  STRONG: 100,
  PARTIAL: 70,
  WEAK: 40,
  LIMITED: 20,
  UNVERIFIED: 0,
};

export function certificationStatus(bet: CertificationBet, startedAt: Date | null): CertificationStatus {
  if (!startedAt || bet.createdAt < startedAt) return "EXCLUDED";
  if (bet.result === "EN_ATTENTE") {
    if (bet.initialProofAt && bet.initialProofBeforeEvent === true) return "AWAITING_RESULT";
    if (bet.initialProofAt) return "TIMING_UNCONFIRMED";
    return "UNVERIFIED";
  }

  const hasQualifiedInitialProof = Boolean(bet.initialProofAt) && bet.initialProofBeforeEvent === true;
  const hasResultProof = Boolean(bet.resultProofAt) && bet.resultEntryMethod === "SCAN";
  if (hasQualifiedInitialProof && hasResultProof) return "STRONG";
  if (hasQualifiedInitialProof && bet.resultEntryMethod === "MANUAL") return "PARTIAL";
  if (bet.entryMethod === "MANUAL" && hasResultProof) return "WEAK";
  if (hasResultProof) return "LIMITED";
  return "UNVERIFIED";
}

export function certificationSummary(bets: CertificationBet[], startedAt: Date | null) {
  const rows = bets.map((bet) => ({ bet, status: certificationStatus(bet, startedAt) }));
  const included = rows.filter(({ status }) => status !== "EXCLUDED");
  const settled = included.filter(({ bet }) => bet.result !== "EN_ATTENTE");
  const scored = settled.filter(({ bet }) => Number.isFinite(bet.stakeUnits) && (bet.stakeUnits ?? 0) > 0);
  const volume = scored.reduce((sum, { bet }) => sum + Math.abs(bet.stakeUnits ?? 0), 0);
  const weighted = scored.reduce((sum, { bet, status }) => {
    const weight = CERTIFICATION_WEIGHTS[status as keyof typeof CERTIFICATION_WEIGHTS] ?? 0;
    return sum + Math.abs(bet.stakeUnits ?? 0) * weight;
  }, 0);
  const strong = scored.filter(({ status }) => status === "STRONG");
  const strongVolume = strong.reduce((sum, { bet }) => sum + Math.abs(bet.stakeUnits ?? 0), 0);
  const score = volume > 0 ? Math.round(weighted / volume) : null;
  const observation = settled.length < 10 || volume < 20;
  const level = score === null || observation ? "OBSERVATION" : score >= 85 ? "GOLD" : score >= 65 ? "SILVER" : score >= 40 ? "BRONZE" : "UNVERIFIED";

  return {
    rulesVersion: CERTIFICATION_RULES_VERSION,
    publishedBets: included.length,
    pendingBets: included.length - settled.length,
    settledBets: settled.length,
    scoredBets: scored.length,
    volume,
    strongVolume,
    strongBetPercent: settled.length ? Math.round((strong.length / settled.length) * 100) : 0,
    strongVolumePercent: volume ? Math.round((strongVolume / volume) * 100) : 0,
    score,
    level,
    statuses: rows.map(({ status }) => status),
  };
}
