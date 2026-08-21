import { describe, expect, it } from "vitest";
import { bookmakerKind } from "../bookmakers";
import { correctionSummary, extensionForMime, finalBetsForScan } from "./quality";
import { hasExplicitQualityConsent, isOwnedBy, isPrivateQualityStoragePath } from "./quality-guard";
import type { ParsedBet } from "./types";

const raw = [{ ticketRef: null, sport: "Football", betType: "Résultat du match", description: "PSG - OM", eventResult: null, date: "2026-08-10", stake: 10, odds: 1.9, result: "EN_ATTENTE" as const }];
const final: ParsedBet[] = [{ ...raw[0], eventResult: null, boosted: false, originalOdds: null, freebet: false, live: false, cashOutAmount: null, taxonomyMismatch: false }];

describe("scan quality consent and ownership", () => {
  it("requires explicit consent before any screenshot can be stored", () => {
    expect(hasExplicitQualityConsent(null)).toBe(false);
    expect(hasExplicitQualityConsent("false")).toBe(false);
    expect(hasExplicitQualityConsent("true")).toBe(true);
  });

  it("does not authorize another user's report or storage path", () => {
    expect(isOwnedBy("user-a", "user-a")).toBe(true);
    expect(isOwnedBy("user-a", "user-b")).toBe(false);
    expect(isPrivateQualityStoragePath("user-a", "user-a/report.png")).toBe(true);
    expect(isPrivateQualityStoragePath("user-a", "user-b/report.png")).toBe(false);
  });

  it("records the extraction-to-review differences without changing a global prompt", () => {
    expect(correctionSummary(raw, final).count).toBe(0);
    const corrected = [{ ...final[0], sport: "Tennis", odds: 2.1 }];
    expect(correctionSummary(raw, corrected)).toEqual({ count: 2, types: ["sport", "odds"] });
  });

  it("keeps known untested and custom bookmakers distinct", () => {
    expect(bookmakerKind("Winamax")).toBe("tested");
    expect(bookmakerKind("Unibet")).toBe("tested");
    expect(bookmakerKind("Bet365")).toBe("untested");
    expect(bookmakerKind("Local Bookmaker")).toBe("custom");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
  });

  it("keeps each screenshot report limited to its own reviewed bets", () => {
    const second = { ...final[0], sourceScanIndex: 1, description: "Real Madrid - Barça" };
    const first = { ...final[0], sourceScanIndex: 0 };
    expect(finalBetsForScan([first, second], 0)).toEqual([first]);
    expect(finalBetsForScan([first, second], 1)).toEqual([second]);
  });
});
