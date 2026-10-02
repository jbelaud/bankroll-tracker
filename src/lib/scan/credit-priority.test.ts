import { describe, expect, it } from "vitest";
import type { ScanCreditBatch } from "@prisma/client";
import { compareCreditBatches } from "./credit-priority";

const now = new Date("2026-10-01T12:00:00Z");
const lot = (id: string, type: ScanCreditBatch["type"], expiry: string | null, granted = "2026-09-01T12:00:00Z") => ({
  id, type, expiresAt: expiry ? new Date(expiry) : null, grantedAt: new Date(granted),
}) as ScanCreditBatch;
const sorted = (lots: ScanCreditBatch[]) => lots.sort((a, b) => compareCreditBatches(a, b, now)).map((b) => b.id);

describe("priorité des lots de scans", () => {
  it("consomme le bonus initial qui expire avant le mensuel", () => {
    expect(sorted([lot("monthly", "MONTHLY", "2026-10-20"), lot("initial", "INITIAL", "2026-10-03")])).toEqual(["initial", "monthly"]);
  });
  it("privilégie l'échéance réelle sur le type pour toutes les sources", () => {
    expect(sorted([lot("monthly", "MONTHLY", "2026-10-20"), lot("partner", "PARTNER", "2026-10-05"),
      lot("promo", "PROMOTIONAL", "2026-10-04"), lot("referral", "REFERRAL", "2026-10-02")]))
      .toEqual(["referral", "promo", "partner", "monthly"]);
  });
  it("utilise l'ancienneté d'attribution pour départager une même expiration", () => {
    expect(sorted([lot("new-monthly", "MONTHLY", "2026-10-20", "2026-09-20"),
      lot("old-partner", "PARTNER", "2026-10-20", "2026-09-01")])).toEqual(["old-partner", "new-monthly"]);
  });
  it("préserve les crédits permanents et les initiaux permanents en dernier", () => {
    expect(sorted([lot("initial", "INITIAL", null), lot("referral", "REFERRAL", null, "2026-09-10"),
      lot("monthly", "MONTHLY", "2026-10-20"), lot("partner", "PARTNER", null, "2026-09-05")]))
      .toEqual(["monthly", "partner", "referral", "initial"]);
  });
  it("compare le quota pas encore démarré à une période de 30 jours", () => {
    expect(sorted([lot("monthly", "MONTHLY", null), lot("initial", "INITIAL", "2026-10-10")])).toEqual(["initial", "monthly"]);
  });
});
